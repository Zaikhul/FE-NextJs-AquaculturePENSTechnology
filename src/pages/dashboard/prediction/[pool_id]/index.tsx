import Head from "next/head";
import { useRouter } from 'next/router';
import DashboardLayout from "@/layouts/DashboardLayout";
import DashboardPrediction from "@/views/dashboard/prediction/[poolId]/index";

const PredictionPage = () => {
  const router = useRouter();
  const { pool_id } = router.query;

  console.log("PredictionPage rendered with pool_id:", pool_id);

  if (!pool_id) {
    return (
		<div className="flex justify-center items-center h-screen">
        	Loading...
      	</div>
    );
  }

  return (
    <>
      <Head>
        <title>Data Grafik Hasil Prediksi</title>
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
      <DashboardLayout>
        <DashboardPrediction poolId={pool_id as string} />
      </DashboardLayout>
    </>
  );
};

export default PredictionPage;
