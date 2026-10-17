
const SUPABASE_URL = "https://yofkpnvzqkkzreicnjlj.supabase.co";
const SUPABASE_ANON_KEY = "PASTE_YOUR_PUBLIC_PUBLISHABLE_KEY";

let supabaseClient = null;

function initKartlyAuth() {
  if (!window.supabase || !window.supabase.createClient) {
    console.error("Supabase library load nahi hui.");
    return false;
  }

  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  return true;
}

async function kartlySignUp(name, email, password) {
  if (!supabaseClient && !initKartlyAuth()) {
    throw new Error("Authentication setup complete nahi hai.");
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: name.trim()
      }
    }
  });

  if (error) throw error;
  return data;
}

async function kartlyLogin(email, password) {
  if (!supabaseClient && !initKartlyAuth()) {
    throw new Error("Authentication setup complete nahi hai.");
  }

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email: email.trim(),
      password
    });

  if (error) throw error;
  return data;
}

async function kartlyLogout() {
  if (!supabaseClient && !initKartlyAuth()) {
    throw new Error("Authentication setup complete nahi hai.");
  }

  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
}

async function kartlyCurrentUser() {
  if (!supabaseClient && !initKartlyAuth()) {
    throw new Error("Authentication setup complete nahi hai.");
  }

  const { data, error } = await supabaseClient.auth.getUser();
  if (error) throw error;
  return data.user;
}

