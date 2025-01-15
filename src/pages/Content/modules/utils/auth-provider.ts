/* eslint-disable prettier/prettier */

const API_URL: string = 'http://localhost:5001/graphql';

type LoginResponse = {
  success: boolean;
  redirectTo?: string;
  error?: {
    message: string;
    name: string;
  };
};

async function serverLogin(email: string, password: string): Promise<LoginResponse> {
  if (!API_URL) throw new Error('API_URL is not defined');

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      credentials: 'include',
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

    const result: {
      data?: { login: boolean };
      errors?: { message: string }[];
    } = await response.json();

    const setCookieHeader = response.headers.get("set-cookie");
    if (setCookieHeader) {
      console.log("Set-Cookie header:", setCookieHeader);
      // Extract the cookie value
      const regex = /gql-api=(s%3A[^;]+)/; // Match 'gql-api=' followed by the value starting with 's%3A' up to the semicolon
      const match = setCookieHeader.match(regex);
      if (match) {
        const cookieName = "gql-api";
        const rawCookieValue = match[1]; // Extract the raw encoded value

        // Decode the cookie value
        const decodedCookieValue = decodeURIComponent(rawCookieValue);
        console.log("Setting cookie:", cookieName, decodedCookieValue);

        // Set the cookie with the fully decoded value
        await chrome.cookies.set({
          url: "https://uncch.instructure.com/",
          domain: ".instructure.com",
          name: cookieName,
          value: decodedCookieValue,
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          path: "/",
        });
      }
    }

    console.log("Cookie:" + await chrome.cookies.get({ url: "https://uncch.instructure.com/", name: "gql-api" }));

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
        name: "InvalidCredentials",
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

export default serverLogin;
