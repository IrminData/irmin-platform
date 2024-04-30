import { IoAdd } from "react-icons/io5";

export default function AddNewDataSource() {
  return (
    <>
      <div className="fixed z-10 top-28 right-10">
        <button className="flex items-center justify-center h-10 w-10 bg-ash_gray rounded-full text-white cursor-pointer transition-all hover:opacity-50">
          <IoAdd size={30} />
        </button>
      </div>
    </>
  );
}
