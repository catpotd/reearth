import React from "react";
import { useParams } from "react-router-dom";

import Plugin from "@reearth/classic/components/organisms/Settings/Project/Plugin";
import { AuthenticationRequiredPage, withAuthorisation } from "@reearth/services/auth";

export type Props = {
  path?: string;
};

const PluginPage: React.FC<Props> = () => {
  const { projectId = "" } = useParams();
  return (
    <AuthenticationRequiredPage>
      <Plugin projectId={projectId} />;
    </AuthenticationRequiredPage>
  );
};

export default withAuthorisation()(PluginPage);
