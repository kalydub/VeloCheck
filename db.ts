
import Dexie, { Table } from 'dexie';
import { BikeProfile } from './types';

export interface AppConfig {
    key: string;
    value: any;
}

export class VeloCheckDatabase extends Dexie {
    bikes!: Table<BikeProfile>;
    config!: Table<AppConfig>;

    constructor() {
        super('VeloCheckDB');
        this.version(1).stores({
            bikes: 'id, name, brand',
            config: 'key'
        });
    }
}

export const db = new VeloCheckDatabase();
