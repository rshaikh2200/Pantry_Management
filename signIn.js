// src/SignIn.js
import React, { useState } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword } from "firebase/auth";

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async (event) => {
    event.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('User signed in:', userCredential.user);
    } catch (error) {
      console.error('Error signing in:', error.message);
    }
  };

  return (
    <form onSubmit={handleSignIn}>
      <h2>Sign In</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Sign In</button>
    </form>
  );
};

export default SignIn;
