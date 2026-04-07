
import fetch from 'node-fetch';

const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSouyEoRMmp2bAoGgMOtPvN4UfjUetBXnvQBVjPdfcvLfVl2dUNe185DbR2usGyK4UO38p2sb8lBkKN/pub?gid=508129500&single=true&output=csv&_t=" + Date.now();

async function test() {
  const headersSets = [
    {}, // No headers
    { 'User-Agent': 'Mozilla/5.0' },
    { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  ];

  for (const headers of headersSets) {
    console.log(`Testing with headers: ${JSON.stringify(headers)}`);
    try {
      const res = await fetch(url, { headers });
      console.log(`Status: ${res.status} ${res.statusText}`);
      if (res.ok) {
        const text = await res.text();
        console.log(`Content length: ${text.length}`);
      } else {
        const text = await res.text();
        console.log(`Error body start: ${text.substring(0, 100)}`);
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
    }
    console.log('---');
  }
}

test();
