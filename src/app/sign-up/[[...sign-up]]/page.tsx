import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#FAF8F4] px-5 py-10">
      <SignUp
        appearance={{
          variables: {
            colorPrimary: "#4F5B55",
            borderRadius: "8px",
          },
        }}
      />
    </main>
  );
}
