import { navigation } from '@/constant/navigation';
import { redirect } from 'next/navigation';

export default function Home() {
  redirect(navigation.woo());
}
