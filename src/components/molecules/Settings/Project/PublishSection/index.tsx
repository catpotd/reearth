import React from "react";
import { useIntl } from "react-intl";

import Divider from "@reearth/components/atoms/Divider";
import Icon from "@reearth/components/atoms/Icon";
import Text from "@reearth/components/atoms/Text";
import Field from "@reearth/components/molecules/Settings/Field";
import ChangeSiteNameModal from "@reearth/components/molecules/Settings/Project/ChangeSiteNameModal";
import Section from "@reearth/components/molecules/Settings/Section";
import { styled, useTheme } from "@reearth/theme";
import { metricsSizes } from "@reearth/theme/metrics";

import useHooks, { Status } from "./hooks";

export type NotificationType = "error" | "warning" | "info" | "success";

interface Props {
  className?: string;
  projectId: string;
  loading?: boolean;
  projectAlias?: string;
  publicationStatus?: Status;
  validAlias?: boolean;
  validatingAlias?: boolean;
  currentLanguage?: string;
  currentTheme?: string;
  onPublish?: (alias: string | undefined, publicationStatus: Status) => void | Promise<void>;
  onAliasValidate?: (alias: string) => void;
  onNotificationChange?: (type: NotificationType, text: string, heading?: string) => void;
}

const PublishSection: React.FC<Props> = ({
  projectId,
  loading,
  projectAlias,
  publicationStatus,
  validAlias,
  validatingAlias,
  currentLanguage,
  currentTheme,
  onPublish,
  onAliasValidate,
  onNotificationChange,
}) => {
  const theme = useTheme();
  const intl = useIntl();

  const {
    alias,
    extensions,
    accessToken,
    url,
    purl,
    showDModal,
    publishDisabled,
    handlePublish,
    handleDomainModalClose,
    setDModal,
    handleAliasChange,
    handleCopyToClipBoard,
  } = useHooks(
    projectAlias,
    loading,
    publicationStatus,
    validAlias,
    validatingAlias,
    onAliasValidate,
    onPublish,
  );

  return (
    <>
      <Wrapper>
        <Section title={intl.formatMessage({ defaultMessage: "Site settings" })}>
          <StyledText size="m" color={theme.main.strongText}>
            {intl.formatMessage({ defaultMessage: "Site name" })}
          </StyledText>
          <Text size="s">
            {alias
              ? intl.formatMessage({
                  defaultMessage: "Access your project, copy or edit the URL below.",
                })
              : intl.formatMessage({
                  defaultMessage:
                    "Once your project is published from the editor page the URL details will be shown here.",
                })}
          </Text>
          {alias && (
            <StyledItem
              header={purl}
              action={<StyledIcon icon="edit" size={20} onClick={() => setDModal(true)} />}
              secondaryAction={
                <StyledIcon icon="copyCode" size={20} onClick={handleCopyToClipBoard(purl)} />
              }
            />
          )}
        </Section>
        {extensions && accessToken ? (
          <>
            <Divider margin="0" />
            {extensions.map(ext => (
              <ext.component
                key={ext.id}
                projectId={projectId}
                projectAlias={projectAlias}
                lang={currentLanguage as "en" | "ja"}
                theme={currentTheme as "dark" | "light"}
                accessToken={accessToken}
                onNotificationChange={onNotificationChange}
              />
            ))}
          </>
        ) : null}
      </Wrapper>
      <ChangeSiteNameModal
        show={showDModal}
        onClose={handleDomainModalClose}
        url={url}
        alias={alias}
        onAliasChange={handleAliasChange}
        handlePublish={handlePublish}
        disabled={publishDisabled}
      />
    </>
  );
};

const Wrapper = styled.div`
  width: 100%;
  background-color: ${props => props.theme.main.lighterBg};
  position: relative;
`;

const StyledText = styled(Text)`
  margin-bottom: ${`${metricsSizes["m"]}px`};
`;

const StyledItem = styled(Field)`
  margin-top: ${metricsSizes["3xl"]}px;
`;

const StyledIcon = styled(Icon)`
  cursor: pointer;
  color: ${props => props.theme.main.text};
  margin-left: ${`${metricsSizes["m"]}px`};

  &:hover {
    color: ${props => props.theme.main.strongText};
  }
`;

export default PublishSection;
