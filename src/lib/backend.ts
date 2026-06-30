export async function makeApiRequest(
	host: string,
	path: string,
	method: string = "GET",
): Promise<any> {
	const response = await fetch(host + path, { method });
	if (!response.ok) {
		let message = response.statusText;
		try {
			const json = await response.json();
			if (json && json.message) {
				message = response.statusText + ": " + json.message;
			}
		} catch {}
		throw new Error(message);
	}
	return await response.json();
}

let cachedClientIds: { [host: string]: { [forge: string]: string } } = {};
export async function fetchClientId(
	host: string,
	forge: string,
): Promise<string> {
	if (cachedClientIds[host] && cachedClientIds[host][forge]) {
		return cachedClientIds[host][forge];
	}
	let clientId = (await makeApiRequest(host, `/api/oauth/${forge}/client_id`))
		.client_id;
	cachedClientIds[host] = cachedClientIds[host] || {};
	cachedClientIds[host][forge] = clientId;
	return clientId;
}

export interface AuthorisedApp {
	forge: string;
	clientId: string;
	accessToken: string;
}
