import { Dexie, type Table } from "dexie";
export { liveQuery } from "dexie";

import type { AuthorisedApp, SeqCounter } from "./backend";
import type { Community } from "./communities";

export const db = new Dexie("db") as Dexie & {
	communities: Table<Community, [forge: string, path: string]>;
	authorisedApps: Table<AuthorisedApp, [forge: string, clientId: string]>;
	seqCounters: Table<
		SeqCounter,
		[forge: string, path: string, channelId: string]
	>;
};

db.version(1).stores({
	communities: "[forge+path], forge, path",
	authorisedApps: "[forge+clientId], forge, clientId, accessToken",
	seqCounters: "[forge+path+channelId], forge, path, channelId, seqCount",
});
