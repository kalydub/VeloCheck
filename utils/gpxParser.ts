
import { GpxAnalysisResult } from '../types';

/**
 * Calculates the Haversine distance between two points on the Earth.
 */
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function parseGpxFile(file: File): Promise<GpxAnalysisResult> {
  const text = await file.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, "text/xml");

  const trkpts = Array.from(xmlDoc.getElementsByTagName("trkpt"));
  let totalDistance = 0;
  let elevationGain = 0;
  let lastEle: number | null = null;

  for (let i = 0; i < trkpts.length; i++) {
    const pt = trkpts[i];
    const lat = parseFloat(pt.getAttribute("lat") || "0");
    const lon = parseFloat(pt.getAttribute("lon") || "0");
    const eleNode = pt.getElementsByTagName("ele")[0];
    const ele = eleNode ? parseFloat(eleNode.textContent || "0") : null;

    if (i > 0) {
      const prevPt = trkpts[i - 1];
      const prevLat = parseFloat(prevPt.getAttribute("lat") || "0");
      const prevLon = parseFloat(prevPt.getAttribute("lon") || "0");
      totalDistance += calculateHaversineDistance(prevLat, prevLon, lat, lon);
    }

    if (ele !== null && lastEle !== null) {
      const diff = ele - lastEle;
      if (diff > 0) {
        elevationGain += diff;
      }
    }
    lastEle = ele;
  }

  const nameNode = xmlDoc.getElementsByTagName("name")[0];
  const name = nameNode ? nameNode.textContent || file.name : file.name;
  
  const timeNode = xmlDoc.getElementsByTagName("time")[0];
  const startTime = timeNode ? timeNode.textContent || new Date().toISOString() : new Date().toISOString();

  return {
    distance: totalDistance,
    elevationGain: elevationGain,
    name: name,
    startTime: startTime
  };
}
