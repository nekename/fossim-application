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
