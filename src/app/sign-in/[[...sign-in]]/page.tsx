import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#FAF8F4] px-5 py-10">
      <SignIn
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
