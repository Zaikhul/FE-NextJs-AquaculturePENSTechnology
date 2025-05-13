import Head from "next/head";
import { Inter } from 'next/font/google'
import AdminLayout from "@/layouts/AdminLayout";
import AdminPonds from "@/views/admin/ponds/AdminPonds";

const inter = Inter({ subsets: ["latin"] });

import type { NextPage } from 'next'

const PondsPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Daftar Tambak - PENS Aquaculture Technology</title>
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
        <AdminPonds />
      </AdminLayout>
    </>
  );
}

export default PondsPage;