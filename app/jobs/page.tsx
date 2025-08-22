import { redirect } from 'next/navigation';

export default function Jobs() {
  // Redirect to dashboard instead of showing jobs page
  redirect('/');
}
