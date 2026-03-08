import { redirect } from 'next/navigation'

export default function AppPage() {
  // Redirect to demo workspace
  redirect('/app/demo-workspace/dashboard')
}
