import { redirect } from 'next/navigation';

export default function Home() {
  // Default landing: real dashboard
  redirect('/dashboard-real');
}
