const API_URL = 'http://localhost:5001/graphql';

export async function serverLogin(email: string, password: string) {
  if (!API_URL) throw new Error('API_URL is not defined');

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      credentials: 'same-origin',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          mutation Login($input: LoginInput!) {
            login(input: $input)
          }
        `,
        variables: {
          input: { email, password },
        },
      }),
    });

    const result = await response.json();
    
    const setCookieHeader = response.headers.get("set-cookie");
    if (setCookieHeader) {
      // Extract the cookie value
      const regex = /gql-api=(s%3A[^;]+)/; // Match 'gql-api=' followed by the value starting with 's%3A' up to the semicolon
      const match = setCookieHeader.match(regex);
      if (match) {
        const cookieName = 'gql-api';
        const rawCookieValue = match[1]; // Extract the raw encoded value

        // Decode the cookie value
        const decodedCookieValue = decodeURIComponent(rawCookieValue);
        console.log('Setting cookie:', cookieName, decodedCookieValue);

        // Set the cookie with the fully decoded value
        await chrome.cookies.set({
          url: "https://uncch.instructure.com/",
          domain: ".instructure.com",
          name: cookieName,
          value: decodedCookieValue,
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
        });
      }
    }

    if (result.errors) {
      return {
        success: false,
        error: {
          message: result.errors[0].message,
          name: "LoginError",
        },
      };
    }

    if (result.data && result.data.login) {
      return {
        success: true,
        redirectTo: "/",
      };
    }

    return {
      success: false,
      error: {
        message: "Invalid email or password",
        name: "Invalid credentials",
      },
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: {
        message: "An unexpected error occurred",
        name: "ServerError",
      },
    };
  }
}