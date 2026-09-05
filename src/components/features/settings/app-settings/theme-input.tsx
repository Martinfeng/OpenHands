import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { SettingsDropdownInput } from "../settings-dropdown-input";
import { setAppearance, useAppearance } from "#/themes/appearance";

export function ThemeInput() {
  const { t } = useTranslation("openhands");

  const { preference } = useAppearance();

  return (
    <SettingsDropdownInput
      testId="color-theme-input"
      name="color-theme-input"
      label={t(I18nKey.SETTINGS$COLOR_THEME)}
      items={[
        { key: "system", label: t(I18nKey.APPEARANCE$SYSTEM) },
        { key: "light", label: t(I18nKey.APPEARANCE$LIGHT) },
        { key: "dark", label: t(I18nKey.APPEARANCE$DARK) },
      ]}
      selectedKey={preference}
      onSelectionChange={(key) => {
        if (key === "system" || key === "light" || key === "dark")
          setAppearance(key);
      }}
      isClearable={false}
      wrapperClassName="w-full min-w-0"
    />
  );
}
