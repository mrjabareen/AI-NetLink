import http from 'http';

http.get('http://localhost:3001/api/subscribers', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('Subscribers response length:', data.length, 'Status:', res.statusCode, 'Data Preview:', data.substring(0, 500)));
}).on('error', (err) => console.log('Error fetching subscribers:', err.message));

http.get('http://localhost:3001/api/managers', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('Managers response length:', data.length, 'Status:', res.statusCode, 'Data Preview:', data.substring(0, 500)));
}).on('error', (err) => console.log('Error fetching managers:', err.message));
