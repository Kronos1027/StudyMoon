#!/usr/bin/env python3
"""Determina a região AWS do projeto Supabase via lookup do IPv6 nos ranges públicos."""
import ipaddress
import json
import urllib.request

TARGET = ipaddress.ip_address("2600:1f14:271:c001:50a8:cacb:6830:fe4a")

url = "https://ip-ranges.amazonaws.com/ip-ranges.json"
with urllib.request.urlopen(url, timeout=30) as r:
    data = json.load(r)

hits = []
for p in data.get("ipv6_prefixes", []):
    net = ipaddress.ip_network(p["ipv6_prefix"])
    if TARGET in net:
        hits.append(p)

if not hits:
    print(f"SEM MATCH para {TARGET}")
else:
    for h in hits:
        print(f"{TARGET} -> {h['ipv6_prefix']} | regiao={h.get('region')} | servico={h.get('service')}")
