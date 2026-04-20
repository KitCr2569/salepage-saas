const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN || 'EAAXexT5TfPIBOZB2pInr2Wn2U63ZCl9v4NlE66rVp277bE1VofQj0T1N74ZAqZBxvUZB47X1g3jZCPfUo3kK4Bv3K7w5xUqL12nLZA2Yx2dO0eTItlYvZC7L8ZAs2ZABzFZAq1T68Q69iWz6ZAvP7sF626N1fMvS12y2rKOfnFf88r1H0aZAZCofQWZBvSZBQZB1qgJb1mD'; // From user env
const PAGE_ID = '114336388182180';

async function run() {
    const psid = '8855545721205610'; // from screenshot!
    console.log('Fetching conv for psid', psid);
    const convUrl = `https://graph.facebook.com/v19.0/${PAGE_ID}/conversations?user_id=${psid}&access_token=${PAGE_ACCESS_TOKEN}`;
    const res = await fetch(convUrl);
    const data = await res.json();
    console.log('Conv Data:', JSON.stringify(data, null, 2));

    if (data.data && data.data[0]) {
        const convId = data.data[0].id;
        const msgUrl = `https://graph.facebook.com/v19.0/${convId}/messages?fields=message,from,created_time,attachments{mime_type,name,size,image_data,video_data,file_url}&limit=10&access_token=${PAGE_ACCESS_TOKEN}`;
        const mRes = await fetch(msgUrl);
        const mData = await mRes.json();
        console.log('Messages Data:', JSON.stringify(mData, null, 2));
    }
}
run().catch(console.error);
