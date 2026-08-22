import { useEffect, useState } from "react";
import InfoTooltip from "./InfoTooltip.jsx";
import { API_URL } from "../api/client.js";

function EmailPolicyTooltip() {
  const [emailPolicy, setEmailPolicy] = useState({
    loading: true,
    unavailable: false,
    enabled: false,
    domains: [],
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadEmailPolicy() {
      try {
        const response = await fetch(
          `${API_URL}/api/v1/auth/registration-policy`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Unable to load email policy");
        }

        const data = await response.json();

        setEmailPolicy({
          loading: false,
          unavailable: false,
          enabled: Boolean(data.enabled),
          domains: Array.isArray(data.domains) ? data.domains : [],
        });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setEmailPolicy({
          loading: false,
          unavailable: true,
          enabled: false,
          domains: [],
        });
      }
    }

    loadEmailPolicy();

    return () => controller.abort();
  }, []);

  return (
    <InfoTooltip label="Check email access status">
      <span className="email-policy-message">
        {emailPolicy.loading && "Checking the current email access status..."}

        {emailPolicy.unavailable &&
          "The email access status is temporarily unavailable. Your address will still be checked when you try to create an account."}

        {!emailPolicy.loading &&
          !emailPolicy.unavailable &&
          !emailPolicy.enabled &&
          "Email access is open. Any valid email address can be used to create an account."}

        {!emailPolicy.loading &&
          !emailPolicy.unavailable &&
          emailPolicy.enabled &&
          (emailPolicy.domains.length > 0 ? (
            <>
              Email access is restricted for new registrations. Use an address
              from a whitelisted domain: <br />{" "}
              <strong className="email-policy-domains">
                {emailPolicy.domains.map((domain) => (
                  <span className="email-policy-domain" key={domain}>
                    @{domain}
                  </span>
                ))}
              </strong>
              <br />Individually approved addresses may also register.
            </>
          ) : (
            "Email access is restricted. Only addresses approved by the library can create an account."
          ))}
      </span>

      <span className="email-policy-note">
        Already registered accounts skip the email access check and can sign in
        normally.
      </span>
    </InfoTooltip>
  );
}

export default EmailPolicyTooltip;
