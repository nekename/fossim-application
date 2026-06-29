import { Dexie, type EntityTable } from "dexie";
export { liveQuery } from "dexie";

import type { Community } from "./communities";

export const db = new Dexie("db") as Dexie & {
	communities: EntityTable<Community>;
};

db.version(1).stores({ communities: "++id, forge, path" });
