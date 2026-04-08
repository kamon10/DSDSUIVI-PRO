
import fetch from 'node-fetch';

const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS9CBR20IhIgLrI4kKRDV9IDkdB5DzzntJlBFSVhdN7gA_6WOfC-f5xZ7IhCr4rQIdu5Bho3fgHGvih/pub?output=csv";

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
        console.log(`First 3 lines:`);
        console.log(text.split('\n').slice(0, 3).join('\n'));
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
