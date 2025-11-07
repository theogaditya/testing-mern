import './App.css'
import React from 'react';
const VITE_API_URL_BACKEND = import.meta.env.VITE_API_URL_BACKEND;

function App() {

 function submitfun(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const form = e.currentTarget;
  const formData = new FormData(form);
  const raw = Object.fromEntries(formData.entries()); // all values are strings

  // Convert types intentionally:
  const payload = {
    ...raw,
    age: raw.age !== undefined ? Number(raw.age) : undefined,
  };

  console.log("Submitting payload:", payload);

  fetch(`${VITE_API_URL_BACKEND}/v2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  .then(async (res) => {
    if (!res.ok) {
      // Read response body for better debugging
      const body = await res.json().catch(() => ({}));
      throw new Error(`status=${res.status} body=${JSON.stringify(body)}`);
    }
    return res.json();
  })
  .then((responseData) => {
    console.log('Success:', responseData);
    form.reset();
  })
  .catch((error) => {
    console.error('Error:', error);
  });
}

  return (
    <>
      <form onSubmit={submitfun}>
        <div>
          <label htmlFor="email">EMAIL</label>
          <input id="email" name="email" type="email" required />
        </div>
        <div>
          <label htmlFor="name">NAME</label>
          <input id="name" name="name" type="text" required />
        </div>
        <div>
          <label htmlFor="age">AGE</label>
          <input id="age" name="age" type="number" required />
        </div>
        <div>
          <label htmlFor="gender">GENDER</label>
          <select id="gender" name="gender" required>
            <option value="MALE">MALE</option>
            <option value="FEMALE">FEMALE</option>
            <option value="TRANSGENDER">TRANSGENDER</option>
          </select>
        </div>
        <button type="submit">SUBMIT</button>
      </form>
    </>
  )
}

export default App;