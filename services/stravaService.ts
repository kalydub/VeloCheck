
import { db } from "../db";
import { RideData } from "../types";

const CLIENT_ID = (import.meta as any).env?.VITE_STRAVA_CLIENT_ID || (process as any).env?.VITE_STRAVA_CLIENT_ID;
const CLIENT_SECRET = (import.meta as any).env?.VITE_STRAVA_CLIENT_SECRET || (process as any).env?.VITE_STRAVA_CLIENT_SECRET;

// No static refresh token needed for multi-user flow

/**
 * Decodes Strava summary_polyline into [lat, lng] coordinates
 */
function decodePolyline(encoded: string): [number, number][] {
    let points: [number, number][] = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        points.push([lat / 1e5, lng / 1e5]);
    }
    return points;
}

export function getStravaAuthUrl(): string {
    const redirectUri = window.location.origin;
    return `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=activity:read_all,profile:read_all`;
}

export async function exchangeStravaCodeForToken(code: string): Promise<boolean> {
    try {
        const response = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code'
            })
        });

        if (!response.ok) throw new Error("Failed to exchange Strava code");

        const data = await response.json();

        await db.config.put({ key: 'strava_access_token', value: data.access_token });
        await db.config.put({ key: 'strava_refresh_token', value: data.refresh_token });
        await db.config.put({ key: 'strava_token_expiry', value: Date.now() + (data.expires_in * 1000) });
        await db.config.put({ key: 'strava_athlete', value: data.athlete });

        return true;
    } catch (error) {
        console.error("Error exchanging Strava code:", error);
        return false;
    }
}

async function getAccessToken(): Promise<string | null> {
    try {
        // 1. Check current tokens
        const tokenConfig = await db.config.get('strava_access_token');
        const expiryConfig = await db.config.get('strava_token_expiry');
        const refreshConfig = await db.config.get('strava_refresh_token');

        if (!refreshConfig) return null; // User not connected

        if (tokenConfig && expiryConfig && Date.now() < (expiryConfig.value as number) - 300000) { // 5 min buffer
            return tokenConfig.value as string;
        }

        // 2. Refresh token
        const response = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                refresh_token: refreshConfig.value,
                grant_type: 'refresh_token'
            })
        });

        if (!response.ok) throw new Error("Failed to refresh Strava token");

        const data = await response.json();

        await db.config.put({ key: 'strava_access_token', value: data.access_token });
        await db.config.put({ key: 'strava_refresh_token', value: data.refresh_token });
        await db.config.put({ key: 'strava_token_expiry', value: Date.now() + (data.expires_in * 1000) });

        return data.access_token;
    } catch (error) {
        console.error("Error getting Strava access token:", error);
        return null;
    }
}

export async function disconnectStrava(): Promise<void> {
    await db.config.delete('strava_access_token');
    await db.config.delete('strava_refresh_token');
    await db.config.delete('strava_token_expiry');
    await db.config.delete('strava_athlete');
}

export async function isStravaConnected(): Promise<boolean> {
    const config = await db.config.get('strava_refresh_token');
    return !!config;
}

export async function fetchStravaActivities(afterDate?: number): Promise<RideData[]> {
    const token = await getAccessToken();
    if (!token) return [];

    let url = 'https://www.strava.com/api/v3/athlete/activities?per_page=30';
    if (afterDate) {
        // afterDate is timestamp in seconds for Strava
        url += `&after=${Math.floor(afterDate / 1000)}`;
    }

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Failed to fetch Strava activities");

        const activities = await response.json();

        return activities
            .filter((a: any) => a.type === 'Ride' || a.type === 'VirtualRide' || a.type === 'MountainBikeRide')
            .map((a: any) => ({
                id: crypto.randomUUID(),
                stravaId: a.id.toString(),
                name: a.name,
                date: a.start_date,
                distance: a.distance / 1000, // meters to km
                elevationGain: a.total_elevation_gain,
                coordinates: a.map?.summary_polyline ? decodePolyline(a.map.summary_polyline) : undefined
            }));
    } catch (error) {
        console.error("Error fetching Strava activities:", error);
        return [];
    }
}
