import type { AzureTopology, AzureVM, AzureVNet, AzureSubnet, AzureNSG, AzurePeering } from '../integrations/azure/resource-client';

// ─── Built Topology Types ─────────────────────────────────────────────────

export interface TopologySubnet {
  subnet: AzureSubnet;
  vms: AzureVM[];
  nsg: AzureNSG | null;
}

export interface TopologyVNet {
  vnet: AzureVNet;
  subnets: TopologySubnet[];
  vmCount: number;
}

export interface TopologyStats {
  totalVMs: number;
  runningVMs: number;
  deallocatedVMs: number;
  stoppedVMs: number;
  totalVNets: number;
  totalSubnets: number;
  totalNSGs: number;
  totalPublicIPs: number;
  totalLoadBalancers: number;
  peeringCount: number;
  vmsByOS: Record<string, number>;
  vmsBySize: Record<string, number>;
  vmsByLocation: Record<string, number>;
}

export interface BuiltTopology {
  vnets: TopologyVNet[];
  orphanedVMs: AzureVM[];
  peerings: AzurePeering[];
  stats: TopologyStats;
  errors: string[];
  fetchedAt: string;
}

// ─── Builder ──────────────────────────────────────────────────────────────

export function buildTopology(raw: AzureTopology): BuiltTopology {
  // 1. Build subnet → VMs index
  const subnetVMs = new Map<string, AzureVM[]>();
  const attachedVMs = new Set<string>();

  for (const vm of raw.vms) {
    if (vm.subnetId) {
      const list = subnetVMs.get(vm.subnetId) ?? [];
      list.push(vm);
      subnetVMs.set(vm.subnetId, list);
      attachedVMs.add(vm.id);
    }
  }

  // 2. Build NSG lookup
  const nsgMap = new Map(raw.nsgs.map(n => [n.id, n]));

  // 3. Build hierarchical VNet → Subnet → VM structure
  const vnets: TopologyVNet[] = raw.vnets.map(vnet => {
    const topoSubnets: TopologySubnet[] = vnet.subnets.map(subnet => ({
      subnet,
      vms: subnetVMs.get(subnet.id) ?? [],
      nsg: subnet.nsgId ? nsgMap.get(subnet.nsgId) ?? null : null,
    }));

    const vmCount = topoSubnets.reduce((sum, s) => sum + s.vms.length, 0);

    return { vnet, subnets: topoSubnets, vmCount };
  });

  // 4. Sort VNets by VM count descending, then by name
  vnets.sort((a, b) => {
    if (a.vmCount !== b.vmCount) return b.vmCount - a.vmCount;
    return a.vnet.name.localeCompare(b.vnet.name);
  });

  // 5. Collect orphaned VMs (not associated with any known subnet)
  const orphanedVMs = raw.vms.filter(vm => !attachedVMs.has(vm.id));

  // 6. Collect all peerings across all VNets
  const peerings: AzurePeering[] = [];
  const seenPeerings = new Set<string>();
  for (const vnet of raw.vnets) {
    for (const p of vnet.peerings) {
      const key = [vnet.id, p.remoteVNetId].sort().join('|');
      if (!seenPeerings.has(key)) {
        seenPeerings.add(key);
        peerings.push(p);
      }
    }
  }

  // 7. Compute stats
  const vmsByOS: Record<string, number> = {};
  const vmsBySize: Record<string, number> = {};
  const vmsByLocation: Record<string, number> = {};

  for (const vm of raw.vms) {
    const os = vm.osType || 'Unknown';
    vmsByOS[os] = (vmsByOS[os] ?? 0) + 1;
    vmsBySize[vm.vmSize] = (vmsBySize[vm.vmSize] ?? 0) + 1;
    vmsByLocation[vm.location] = (vmsByLocation[vm.location] ?? 0) + 1;
  }

  const stats: TopologyStats = {
    totalVMs: raw.vms.length,
    runningVMs: raw.vms.filter(v => v.powerState === 'running').length,
    deallocatedVMs: raw.vms.filter(v => v.powerState === 'deallocated').length,
    stoppedVMs: raw.vms.filter(v => v.powerState === 'stopped').length,
    totalVNets: raw.vnets.length,
    totalSubnets: raw.vnets.reduce((sum, v) => sum + v.subnets.length, 0),
    totalNSGs: raw.nsgs.length,
    totalPublicIPs: raw.publicIPs.filter(ip => ip.ipAddress).length,
    totalLoadBalancers: raw.loadBalancers.length,
    peeringCount: peerings.length,
    vmsByOS,
    vmsBySize,
    vmsByLocation,
  };

  return {
    vnets,
    orphanedVMs,
    peerings,
    stats,
    errors: raw.errors,
    fetchedAt: raw.fetchedAt,
  };
}
