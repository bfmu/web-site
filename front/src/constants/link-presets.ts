import { LinkPreset, type NavBarLink } from '@/types/config'
import I18nKey from '@i18n/i18nKey'
import { i18n } from '@i18n/translation'

export const LinkPresets: { [key in LinkPreset]: NavBarLink } = {
  [LinkPreset.Home]: {
    name: i18n(I18nKey.home),
    url: '/',
  },
  [LinkPreset.Gallery]: {
    name: i18n(I18nKey.gallery),
    url: '/gallery/',
  },
  [LinkPreset.Blog]: {
    name: i18n(I18nKey.blog),
    url: '/blogs/',
  },
  [LinkPreset.About]: {
    name: i18n(I18nKey.about),
    url: '/about/',
  },
  [LinkPreset.Archive]: {
    name: i18n(I18nKey.archive),
    url: '/archive/',
  },
  [LinkPreset.Music]: {
    name: i18n(I18nKey.music),
    url: '/music/',
  },
}
