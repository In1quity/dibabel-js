import React from 'react';
import { EuiButtonIcon, EuiLink, EuiButtonIconColor } from '@elastic/eui';
import { Item } from '../types';

export const ExternalLink = (
  { href, title, icon = 'symlink', color = 'text' }: { href: string, title: string, icon?: string, color?: EuiButtonIconColor }
) => {
  return (<EuiButtonIcon
    color={color}
    href={href}
    target={'_blank'}
    iconType={icon}
    aria-label={'Open external link in a new tab'}
    title={title}
  />);
};

export const ItemSrcLink = ({ item, linkToWD = true }: { item: Item, linkToWD?: boolean }) => {
  return (<><EuiLink href={item.srcTitleUrl}
                     target={'_blank'}>{item.srcFullTitle}</EuiLink>{
    linkToWD ? (<>{' '}[<ItemWikidataLink item={item}/>]</>) : null
  }</>);
};

export const ItemDstLink = ({ item: { dstTitleUrl, lang, project, dstFullTitle } }: { item: Item }) => {
  return (
    <EuiLink href={dstTitleUrl} target={'_blank'}>{prettyDomain(lang, project)}&nbsp;/&nbsp;{dstFullTitle}</EuiLink>);
};

export const ItemWikidataLink = ({ item: { qid } }: { item: Item }) => {
  return (<EuiLink href={`https://wikidata.org/wiki/${qid}`} target={'_blank'}>{qid}</EuiLink>);
};

export const prettyDomain = (lang: string, project: string) => {
  return lang !== '-' ? `${lang}.${project}` : project;
};
