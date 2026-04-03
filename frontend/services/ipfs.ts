// Using Pinata standard API format
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || '';

export async function uploadToIPFS(data: any): Promise<string> {
    try {
        const body = JSON.stringify({
            pinataContent: data,
            pinataMetadata: {
                name: "BugBountyReport"
            }
        });

        const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${PINATA_JWT}`
            },
            body: body
        });
        
        if (!res.ok) throw new Error("Pinata upload failed");
        
        const json = await res.json();
        return json.IpfsHash;
    } catch (error) {
        console.error("IPFS Upload Error:", error);
        throw error;
    }
}

export async function fetchFromIPFS(cid: string): Promise<any> {
    try {
        // Use dedicated gateway for fetching
        const res = await fetch(`https://indigo-useful-mite-186.mypinata.cloud/ipfs/${cid}`);
        if (!res.ok) throw new Error("IPFS fetch failed");
        return await res.json();
    } catch (error) {
        console.error("IPFS Fetch Error:", error);
        throw error;
    }
}
