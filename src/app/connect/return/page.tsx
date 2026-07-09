export default async function ConnectReturn({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "unknown";
  const errorCode = typeof params.errorCode === "string" ? params.errorCode : null;
  const errorMessage =
    typeof params.errorMessage === "string" ? params.errorMessage : null;
  const failed = status !== "completed";

  return (
    <main className="container">
      {failed ? (
        <>
          <h1>Request failed</h1>
          <p>
            The data connection did not complete (status: <code>{status}</code>
            {errorCode ? (
              <>
                , error: <code>{errorCode}</code>
              </>
            ) : null}
            ).
          </p>
          {errorMessage ? <p>{errorMessage}</p> : null}
          <p>Return to the ReadCV tab and use &ldquo;Try again&rdquo;.</p>
        </>
      ) : (
        <>
          <h1>Connected</h1>
          <p>
            Your data connection completed. You can close this tab and return to
            ReadCV — the read finishes in the original tab.
          </p>
        </>
      )}
    </main>
  );
}
