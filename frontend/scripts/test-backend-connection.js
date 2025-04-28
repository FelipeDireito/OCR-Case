// Script to test connectivity to the backend

async function testConnection() {
  try {
    // Try connecting to the backend using both localhost and service name
    console.log('Testing connection to backend...');
    
    try {
      console.log('Trying http://localhost:5005/auth/login...');
      const response1 = await fetch('http://localhost:5005/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
      });
      console.log('Response from localhost:', response1.status);
      if (response1.ok) {
        const data = await response1.json();
        console.log('Success with localhost! User:', data.email);
      }
    } catch (error) {
      console.error('Error with localhost:', error.message);
    }
    
    try {
      console.log('\nTrying http://backend:5005/auth/login...');
      const response2 = await fetch('http://backend:5005/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
      });
      console.log('Response from backend service:', response2.status);
      if (response2.ok) {
        const data = await response2.json();
        console.log('Success with backend service name! User:', data.email);
      }
    } catch (error) {
      console.error('Error with backend service name:', error.message);
    }
    
  } catch (error) {
    console.error('General error:', error);
  }
}

testConnection();
