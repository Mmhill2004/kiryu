import type { BuiltTopology, TopologyVNet } from './topology-builder';

// ─── Layout Constants ─────────────────────────────────────────────────────

const VNET_WIDTH = 480;
const VNET_MARGIN = 40;
const VNET_PADDING = 20;
const VNET_HEADER = 60;
const SUBNET_MARGIN = 12;
const SUBNET_HEADER = 48;
const VM_WIDTH = 82;
const VM_HEIGHT = 56;
const VM_MARGIN = 8;
const VMS_PER_ROW = 5;
const COLUMNS = 2;

// ─── SVG Output ───────────────────────────────────────────────────────────

export interface SVGTopology {
  svg: string;
  width: number;
  height: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function escapeXml(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '\u2026' : str;
}

function powerStateColor(state: string): string {
  switch (state) {
    case 'running': return '#10b981';
    case 'deallocated': return '#6b7280';
    case 'stopped': return '#ef4444';
    default: return '#eab308';
  }
}

function peeringColor(state: string): string {
  return state === 'Connected' ? '#10b981' : state === 'Initiated' ? '#eab308' : '#ef4444';
}

// ─── VNet Height Calculator ───────────────────────────────────────────────

function calcVNetHeight(topo: TopologyVNet): number {
  let h = VNET_HEADER + VNET_PADDING;
  for (const s of topo.subnets) {
    const rows = Math.max(1, Math.ceil(s.vms.length / VMS_PER_ROW));
    h += SUBNET_HEADER + rows * (VM_HEIGHT + VM_MARGIN) + VM_MARGIN + SUBNET_MARGIN;
  }
  if (topo.subnets.length === 0) h += 40;
  return h + VNET_PADDING;
}

// ─── Renderer ─────────────────────────────────────────────────────────────

export function renderTopologySVG(topology: BuiltTopology): SVGTopology {
  if (topology.vnets.length === 0) {
    return { svg: '', width: 0, height: 0 };
  }

  const elements: string[] = [];
  const vnetPositions = new Map<string, { x: number; y: number; w: number; h: number }>();

  // Layout VNets in a 2-column grid
  const colHeights = new Array(COLUMNS).fill(VNET_MARGIN) as number[];

  for (const topo of topology.vnets) {
    const vnetH = calcVNetHeight(topo);

    // Pick the shortest column
    let col = 0;
    for (let c = 1; c < COLUMNS; c++) {
      if (colHeights[c]! < colHeights[col]!) col = c;
    }

    const x = VNET_MARGIN + col * (VNET_WIDTH + VNET_MARGIN);
    const y = colHeights[col]!;

    vnetPositions.set(topo.vnet.id, { x, y, w: VNET_WIDTH, h: vnetH });
    colHeights[col] = y + vnetH + VNET_MARGIN;

    // Draw VNet container
    elements.push(
      `<rect x="${x}" y="${y}" width="${VNET_WIDTH}" height="${vnetH}" rx="10" fill="#0c1322" stroke="#1e293b" stroke-width="2"/>`,
      `<text x="${x + 16}" y="${y + 28}" class="vnet-label">${escapeXml(topo.vnet.name)}</text>`,
      `<text x="${x + 16}" y="${y + 46}" class="vnet-cidr">${escapeXml(topo.vnet.addressPrefixes.join(', '))}</text>`,
      `<text x="${x + VNET_WIDTH - 16}" y="${y + 28}" class="vnet-location" text-anchor="end">${escapeXml(topo.vnet.location)}</text>`,
    );

    // Draw subnets
    let subnetY = y + VNET_HEADER + VNET_PADDING;

    for (const sub of topo.subnets) {
      const rows = Math.max(1, Math.ceil(sub.vms.length / VMS_PER_ROW));
      const subnetH = SUBNET_HEADER + rows * (VM_HEIGHT + VM_MARGIN) + VM_MARGIN;
      const subnetX = x + 14;
      const subnetW = VNET_WIDTH - 28;

      elements.push(
        `<rect x="${subnetX}" y="${subnetY}" width="${subnetW}" height="${subnetH}" rx="6" fill="#111827" stroke="#374151" stroke-width="1"/>`,
        `<text x="${subnetX + 12}" y="${subnetY + 20}" class="subnet-label">${escapeXml(sub.subnet.name)}</text>`,
        `<text x="${subnetX + 12}" y="${subnetY + 36}" class="subnet-cidr">${escapeXml(sub.subnet.addressPrefix)}</text>`,
      );

      // NSG badge
      if (sub.nsg) {
        const badgeX = subnetX + subnetW - 70;
        elements.push(
          `<rect x="${badgeX}" y="${subnetY + 8}" width="58" height="20" rx="10" fill="#064e3b" stroke="#10b981" stroke-width="1"/>`,
          `<text x="${badgeX + 29}" y="${subnetY + 22}" class="nsg-badge" text-anchor="middle">NSG</text>`,
        );
      }

      // Draw VMs
      let vmX = subnetX + 10;
      let vmY = subnetY + SUBNET_HEADER;

      for (let i = 0; i < sub.vms.length; i++) {
        if (i > 0 && i % VMS_PER_ROW === 0) {
          vmX = subnetX + 10;
          vmY += VM_HEIGHT + VM_MARGIN;
        }

        const vm = sub.vms[i]!;
        const color = powerStateColor(vm.powerState);

        elements.push(
          `<rect x="${vmX}" y="${vmY}" width="${VM_WIDTH}" height="${VM_HEIGHT}" rx="4" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-width="1.5"/>`,
          `<text x="${vmX + VM_WIDTH / 2}" y="${vmY + 20}" class="vm-name" text-anchor="middle">${escapeXml(truncate(vm.name, 11))}</text>`,
          `<text x="${vmX + VM_WIDTH / 2}" y="${vmY + 34}" class="vm-ip" text-anchor="middle">${escapeXml(vm.privateIP || '')}</text>`,
          `<text x="${vmX + VM_WIDTH / 2}" y="${vmY + 48}" class="vm-state" text-anchor="middle">${escapeXml(vm.powerState)}</text>`,
        );

        // Public IP indicator (blue dot)
        if (vm.publicIP) {
          elements.push(
            `<circle cx="${vmX + VM_WIDTH - 6}" cy="${vmY + 6}" r="5" fill="#3b82f6"/>`,
            `<text x="${vmX + VM_WIDTH - 6}" y="${vmY + 9}" class="pub-ip-dot" text-anchor="middle">P</text>`,
          );
        }

        vmX += VM_WIDTH + VM_MARGIN;
      }

      // Empty subnet placeholder
      if (sub.vms.length === 0) {
        elements.push(
          `<text x="${subnetX + subnetW / 2}" y="${subnetY + SUBNET_HEADER + 24}" class="empty-label" text-anchor="middle">No VMs</text>`,
        );
      }

      subnetY += subnetH + SUBNET_MARGIN;
    }

    // Empty VNet placeholder
    if (topo.subnets.length === 0) {
      elements.push(
        `<text x="${x + VNET_WIDTH / 2}" y="${y + VNET_HEADER + 20}" class="empty-label" text-anchor="middle">No subnets</text>`,
      );
    }
  }

  // Draw peering lines between VNets
  for (const vnet of topology.vnets) {
    for (const peering of vnet.vnet.peerings) {
      const fromPos = vnetPositions.get(vnet.vnet.id);
      const toPos = vnetPositions.get(peering.remoteVNetId);
      if (!fromPos || !toPos) continue;

      const fromCx = fromPos.x + fromPos.w / 2;
      const fromCy = fromPos.y + fromPos.h;
      const toCx = toPos.x + toPos.w / 2;
      const toCy = toPos.y;
      const color = peeringColor(peering.peeringState);
      const dash = peering.peeringState === 'Connected' ? '8,4' : '4,4';

      elements.push(
        `<line x1="${fromCx}" y1="${fromCy}" x2="${toCx}" y2="${toCy}" stroke="${color}" stroke-width="2" stroke-dasharray="${dash}" opacity="0.6"/>`,
        `<text x="${(fromCx + toCx) / 2}" y="${(fromCy + toCy) / 2 - 6}" class="peering-label" text-anchor="middle">${escapeXml(peering.peeringState)}</text>`,
      );
    }
  }

  const totalWidth = COLUMNS * (VNET_WIDTH + VNET_MARGIN) + VNET_MARGIN;
  const totalHeight = Math.max(...colHeights) + VNET_MARGIN;

  const styles = `
    .vnet-label { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 600; fill: #e2e8f0; }
    .vnet-cidr { font-family: 'JetBrains Mono', monospace; font-size: 11px; fill: #64748b; }
    .vnet-location { font-family: 'Outfit', sans-serif; font-size: 11px; fill: #475569; }
    .subnet-label { font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 500; fill: #94a3b8; }
    .subnet-cidr { font-family: 'JetBrains Mono', monospace; font-size: 10px; fill: #4b5563; }
    .nsg-badge { font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 700; fill: #10b981; }
    .vm-name { font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 500; fill: #e2e8f0; }
    .vm-ip { font-family: 'JetBrains Mono', monospace; font-size: 9px; fill: #94a3b8; }
    .vm-state { font-family: 'JetBrains Mono', monospace; font-size: 8px; fill: rgba(255,255,255,0.5); }
    .pub-ip-dot { font-family: 'Outfit', sans-serif; font-size: 7px; font-weight: 700; fill: white; }
    .peering-label { font-family: 'Outfit', sans-serif; font-size: 10px; fill: #94a3b8; }
    .empty-label { font-family: 'Outfit', sans-serif; font-size: 11px; fill: #374151; font-style: italic; }
  `;

  const svg = [
    `<svg viewBox="0 0 ${totalWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Azure network topology diagram">`,
    `<style>${styles}</style>`,
    ...elements,
    `</svg>`,
  ].join('\n');

  return { svg, width: totalWidth, height: totalHeight };
}
