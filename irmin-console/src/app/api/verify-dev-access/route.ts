export type LoginResponse = {
  status?: string;
};

const appPassword = process.env.ENV_PASSWORD ?? 'oiDeNuDEvenTICYc';

const signIn = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sign in to environment</title>
</head>
<body>
<style>
body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
}
.signInDev {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
.signInDev label {
  margin-bottom: 1rem;
}
.signInDev input {
  margin-bottom: 1rem;
}
</style>
<form action="/api/verify-dev-access" method="post">
<div class="signInDev">
<label for="password">Enter password to access this environment</label>
<input type="password" name="password" id="password" placeholder="Password">
<button type="submit">Sign in</button>
</div>
</form>
</body>
</html>
`;

export async function GET() {
  const response = new Response(signIn, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
  return response;
}

export async function POST(req: Request) {
  // Parse the request body
  const body = await req.formData();
  const password = body.get('password');

  // Validate the password
  if (typeof password !== 'string') {
    return new Response('Password is not a string', { status: 400 });
  }
  if (password !== appPassword) {
    return new Response('Wrong password', { status: 403 });
  }

  // Set the cookie
  const expires = new Date(Date.now() + 60 * 60 * 24 * 12 * 365 * 100);
  const setCookieHeader = `authorizedDev=true; Expires=${expires.toUTCString()}; Path=/; HttpOnly`;

  // Redirect to the home page
  const headers = new Headers();
  headers.append('Set-Cookie', setCookieHeader);
  headers.append('Location', '/');
  return new Response(null, { status: 302, headers });
}
