const http = require('http');

const data = JSON.stringify({
  email: "admin@lawezy.com",
  password: "lawezyadminpass",
  firstName: "LawEZY",
  lastName: "Admin",
  role: "ADMIN"
});

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);

  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
