import { Dexie, type Table } from "dexie";
export { liveQuery } from "dexie";

import type { AuthorisedApp } from "./backend";
import type { Community } from "./communities";

export const db = new Dexie("db") as Dexie & {
	communities: Table<Community, [forge: string, path: string]>;
	authorisedApps: Table<AuthorisedApp, [forge: string, clientId: string]>;
};

db.version(1).stores({
	communities: "[forge+path], forge, path",
	authorisedApps: "[forge+clientId], forge, clientId, accessToken",
});
