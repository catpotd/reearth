import { withAuthenticationRequired } from "@auth0/auth0-react";
import { withAuthenticator } from "@aws-amplify/ui-react";
import { ReactNode } from "react";

import GlobalModal from "@reearth/classic/components/organisms/GlobalModal";

import { useAuthenticationRequired } from "./useAuth";

export { AuthProvider } from "./authProvider";
export { useAuth, useCleanUrl, useAuthenticationRequired } from "./useAuth";

export const AuthenticationRequiredPage: React.FC<{ children?: ReactNode }> = ({ children }) => {
  const [isAuthenticated] = useAuthenticationRequired(); // TODO: show error
  return isAuthenticated && children ? (
    <>
      <GlobalModal />
      {children}
    </>
  ) : null;
};

export const withAuthorisation = (): ((props: any) => JSX.Element) => {
  const authProvider = window.REEARTH_CONFIG?.authProvider;

  if (authProvider === "cognito") {
    return withAuthenticator as unknown as (props: any) => JSX.Element;
  }

  return withAuthenticationRequired as unknown as (props: any) => JSX.Element;
};
