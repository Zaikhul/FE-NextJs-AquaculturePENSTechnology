import Head from "next/head";
import { Inter } from "next/font/google";
import MainLayout from "@/layouts/MainLayout";
import HomeViews from "@/views/home/Home";
import { useEffect } from "react";
import { useRouter } from "next/router";

const inter = Inter({ subsets: ["latin"] });

export default function Auth() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/auth/signin")
  }, [router])

	return (
		<>
			<Head>
				<title>PENS Aquaculture Technology - Authorization (Redirect)</title>
				<meta
					name="description"
					content="Pascasarjana Politeknik Elektronika Negeri Surabaya"
				/>
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<MainLayout>
				<HomeViews />
			</MainLayout>
		</>
	);
}
