import Head from "next/head";
import { Inter } from "next/font/google";
import AdminLayout from "@/layouts/AdminLayout";
import AdminUsers from "@/views/admin/users/AdminUsers";

const inter = Inter({ subsets: ["latin"] });

export default function Users() {
	return (
		<>
			<Head>
				<title>Users - PENS Aquaculture Technology</title>
				<meta
					name="description"
					content="Pascasarjana Politeknik Elektronika Negeri Surabaya"
				/>
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1"
				/>
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<AdminLayout>
				<AdminUsers />
			</AdminLayout>
		</>
	);
}
