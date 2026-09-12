import Head from "next/head";
import { useRouter } from "next/router";
import { useAuthGuard } from "@/components/useAuthGuard";
import AdminLayout from "@/components/AdminLayout";
import ProductForm from "@/components/ProductForm";
import { FiArrowLeft } from "react-icons/fi";

export default function CreateProduct() {
  const { ready } = useAuthGuard();
  const router = useRouter();
  if (!ready) return null;
  return (
    <AdminLayout title="Add Product">
      <Head><title>Add Product — C&W Admin</title></Head>
      <button onClick={() => router.push("/products")}
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium mb-5 transition-colors">
        <FiArrowLeft size={16} /> Back to Products
      </button>
      <ProductForm productId={null} initialData={null} />
    </AdminLayout>
  );
}
