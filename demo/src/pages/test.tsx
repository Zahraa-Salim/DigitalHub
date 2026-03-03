'use client';
import { useEffect, useState } from 'react';
import axios from '@/lib/axios';

export default function TestPage() {
  const [status, setStatus] = useState('Testing...');

  useEffect(() => {
    axios.get('/')
      .then(res => setStatus('Website  Connected: ' + res.data))
      .catch(err => setStatus('❌ Error: ' + err.message));
  }, []);

  return <div className="p-8 text-2xl">{status}</div>;
}
