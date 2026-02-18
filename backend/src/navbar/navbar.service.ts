import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  NavbarConfig,
  NavbarConfigDocument,
} from './schemas/navbar-config.schema';
import { UpdateNavbarDto } from './dto/update-navbar.dto';

export interface NavBarLink {
  name: string;
  url: string;
  external?: boolean;
  openInNewTab?: boolean;
  children?: NavBarLink[];
}

function normalizeLink(
  l: { name: string; url?: string; external?: boolean; openInNewTab?: boolean; children?: unknown[] },
  order: number,
): NavBarLink {
  const link: NavBarLink = {
    name: l.name,
    url: l.url ?? '',
    external: l.external ?? false,
    openInNewTab: l.openInNewTab ?? false,
  };
  if (Array.isArray(l.children) && l.children.length > 0) {
    link.children = l.children.map((c: Record<string, unknown>, i: number) =>
      normalizeLink(c as Parameters<typeof normalizeLink>[0], i),
    );
  }
  return link;
}

@Injectable()
export class NavbarService {
  constructor(
    @InjectModel(NavbarConfig.name)
    private readonly navbarConfigModel: Model<NavbarConfigDocument>,
  ) {}

  async getConfig(): Promise<{ links: NavBarLink[] }> {
    const doc = await this.navbarConfigModel.findOne().lean().exec();
    if (!doc || !doc.links || doc.links.length === 0) {
      return { links: [] };
    }
    const links = [...doc.links]
      .sort((a, b) => ((a.order as number) ?? 0) - ((b.order as number) ?? 0))
      .map((l, i) => normalizeLink(l as Parameters<typeof normalizeLink>[0], i));
    return { links };
  }

  async updateConfig(
    dto: UpdateNavbarDto,
    _userId: string,
  ): Promise<{ links: NavBarLink[] }> {
    if (!dto.links) {
      return this.getConfig();
    }
    const links = dto.links.map((l, i) => ({
      name: l.name,
      url: l.url ?? '',
      external: l.external ?? false,
      openInNewTab: l.openInNewTab ?? false,
      order: l.order ?? i,
      children: Array.isArray(l.children)
        ? l.children.map((c, j) => ({
            name: c.name,
            url: c.url ?? '',
            external: c.external ?? false,
            openInNewTab: c.openInNewTab ?? false,
            order: c.order ?? j,
            children: Array.isArray(c.children)
              ? c.children.map((cc, k) => ({
                  name: cc.name,
                  url: cc.url ?? '',
                  external: cc.external ?? false,
                  openInNewTab: cc.openInNewTab ?? false,
                  order: cc.order ?? k,
                }))
              : [],
          }))
        : [],
    }));
    await this.navbarConfigModel.findOneAndUpdate(
      {},
      { $set: { links } },
      { new: true, upsert: true },
    );
    return this.getConfig();
  }
}
