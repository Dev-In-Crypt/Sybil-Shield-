"""
Curated set of known centralized-exchange (CEX) hot wallets + canonical
bridge contracts on Ethereum mainnet.

WHY THIS EXISTS
---------------
The funding-source clusterer (clustering/funding_cluster.py) groups addresses
that share a funder. The pre-pilot calibration retro (see
/blog/preset-calibration) found a 66% false-positive rate on confirmed
governance voters because a single Binance hot wallet that funded hundreds of
ordinary users created one giant "funding cluster". Those users aren't a Sybil
farm — they just cashed out from the same exchange. The exchange's hot wallet
is BASELINE NOISE, not a coordination signal.

The funding clusterer already skips funders in this set (funding_cluster.py
line ~29). The bug was that the set was only 12 addresses — missing most
Binance hot wallets and every other major CEX. This module is the proper fix:
a comprehensive, maintainable, single-source-of-truth list.

PROVENANCE
----------
Addresses are publicly labelled hot wallets cross-referenced from Etherscan
labels, Arkham, and Dune's `labels.cex_addresses`. Only stable, long-lived
hot wallets are included — not deposit addresses (which are per-user and
rotate). Refresh via `python -m sybilshield.data.derive_known_exchanges`
(scaffold) when Etherscan labels change.

All addresses are lowercased. The `KNOWN_EXCHANGES` set is the public export;
`EXCHANGE_LABELS` maps each to a human label for evidence/debugging.
"""
from __future__ import annotations

# address -> human label. Lowercased on load below.
_RAW: dict[str, str] = {
    # ---- Binance (the retro's FP culprit — hot wallets 7 through 28) ----
    "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be": "Binance 1",
    "0xd551234ae421e3bcba99a0da6d736074f22192ff": "Binance 2",
    "0x564286362092d8e7936f0549571a803b203aaced": "Binance 3",
    "0x0681d8db095565fe8a346fa0277bffde9c0edbbf": "Binance 4",
    "0xfe9e8709d3215310075d67e3ed32a380ccf451c8": "Binance 5",
    "0x4e9ce36e442e55ecd9025b9a6e0d88485d628a67": "Binance 6",
    "0xbe0eb53f46cd790cd13851d5eff43d12404d33e8": "Binance 7",
    "0xf977814e90da44bfa03b6295a0616a897441acec": "Binance 8 (cold)",
    "0x001866ae5b3de6caa5a51543fd9fb64f524f5478": "Binance 9",
    "0x85b931a32a0725be14285b66f1a22178c672d69b": "Binance 10",
    "0x708396f17127c42383e3b9014072679b2f60b82f": "Binance 11",
    "0xe0f0cfde7ee664943906f17f7f14342e76a5cec7": "Binance 12",
    "0x8f22f2063d253846b53609231ed80fa571bc0c8f": "Binance 13",
    "0x28c6c06298d514db089934071355e5743bf21d60": "Binance 14",
    "0x21a31ee1afc51d94c2efccaa2092ad1028285549": "Binance 15",
    "0xdfd5293d8e347dfe59e90efd55b2956a1343963d": "Binance 16",
    "0x56eddb7aa87536c09ccc2793473599fd21a8b17f": "Binance 17",
    "0x9696f59e4d72e237be84ffd425dcad154bf96976": "Binance 18",
    "0x4d9ff50ef4da947364bb9650892b2554e7be5e2b": "Binance 19",
    "0x4976a4a02f38326660d17bf34b431dc6e2eb2327": "Binance 20",
    "0xd88b55467f58af508dbfdc597e8ebd2ad2de49b3": "Binance 21",
    "0x7dfe9a368886bf42d4adc10c2dc0d3ed9f97ca51": "Binance 22",
    "0x345d8e3a1f62ee6b1d483890976fd66168e390f2": "Binance 23",
    "0xc3c8e0a39769e2308869f7461364ca48155d1d9e": "Binance 24",
    "0x2e581a5ae722207aa59acd3939771e7c7052dd3d": "Binance 25",
    "0x44592b81c05b4c35efb8424eb9d62538b949ebbf": "Binance 26",
    "0xa344c7ada83113b3b56941f6e85bf2eb425949f3": "Binance 27",
    "0x5a52e96bacdabb82fd05763e25335261b270efcb": "Binance 28",
    # ---- Coinbase ----
    "0x71660c4005ba85c37ccec55d0c4493e66fe775d3": "Coinbase 1",
    "0x503828976d22510aad0201ac7ec88293211d23da": "Coinbase 2",
    "0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740": "Coinbase 3",
    "0x3cd751e6b0078be393132286c442345e5dc49699": "Coinbase 4",
    "0xb5d85cbf7cb3ee0d56b3bb207d5fc4b82f43f511": "Coinbase 5",
    "0xeb2629a2734e272bcc07bda959863f316f4bd4cf": "Coinbase 6",
    "0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43": "Coinbase 7",
    "0x02466e547bfdab679fc49e96bbfc62b9747d997c": "Coinbase 8",
    "0x6b76f8b1e9e59913bfe758821887311ba1805cab": "Coinbase 9",
    # ---- OKX ----
    "0x6cc5f688a315f3dc28a7781717a9a798a59fda7b": "OKX 1",
    "0x236f9f97e0e62388479bf9e5ba4889e46b0273c3": "OKX 2",
    "0xa7efae728d2936e78bda97dc267687568dd593f3": "OKX 3",
    "0x5041ed759dd4afc3a72b8192c143f72f4724081a": "OKX 4",
    # ---- Kraken ----
    "0x2910543af39aba0cd09dbb2d50200b3e800a63d2": "Kraken 1",
    "0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13": "Kraken 2",
    "0xe853c56864a2ebe4576a807d26fdc4a0ada51919": "Kraken 3",
    "0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0": "Kraken 4",
    "0xfa52274dd61e1643d2205169732f29114bc240b3": "Kraken 5",
    # ---- Bybit ----
    "0xf89d7b9c864f589bbf53a82105107622b35eaa40": "Bybit hot",
    "0xee5b5b923ffce93a870b3104b7ca09c3db80047a": "Bybit 2",
    # ---- Gate.io ----
    "0x0d0707963952f2fba59dd06f2b425ace40b492fe": "Gate.io 1",
    "0x1c4b70a3968436b9a0a9cf5205c787eb81bb558c": "Gate.io 2",
    # ---- KuCoin ----
    "0x2b5634c42055806a59e9107ed44d43c426e58258": "KuCoin 1",
    "0x689c56aef474df92d44a1b70850f808488f9769c": "KuCoin 2",
    "0xa1d8d972560c2f8144af871db508f0b0b10a3fbf": "KuCoin 3",
    # ---- Bitget ----
    "0x0639556f03714a74a5feeaf5736a4a64ff70d206": "Bitget hot",
    # ---- Crypto.com ----
    "0x6262998ced04146fa42253a5c0af90ca02dfd2a3": "Crypto.com 1",
    "0x46340b20830761efd32832a74d7169b29feb9758": "Crypto.com 2",
    # ---- Huobi / HTX ----
    "0x59a5208b32e627891c389ebafc644145224006e8": "Huobi 1",
    "0xab5c66752a9e8167967685f1450532fb96d5d24f": "Huobi 2",
    "0x5c985e89dde482efe97ea9f1950ad149eb73829b": "Huobi 3",
    "0xdc76cd25977e0a5ae17155770273ad58648900d3": "Huobi 4",
    # ---- Bitfinex ----
    "0x876eabf441b2ee5b5b0554fd502a8e0600950cfa": "Bitfinex 1",
    "0x1151314c646ce4e0efd76d1af4760ae66a9fe30f": "Bitfinex 2",
    # ---- Canonical bridges (not exchanges, but same "shared funder" noise) ----
    "0x8315177ab297ba92a06054ce80a67ed4dbd7ed3a": "Arbitrum One bridge",
    "0x99c9fc46f92e8a1c0dec1b1747d010903e884be1": "Optimism gateway",
    "0x40ec5b33f54e0e8a33a975908c5ba1c14e5bbbdf": "Polygon (Matic) bridge",
    "0x3154cf16ccdb4c6d922629664174b904d80f2c35": "Base bridge",
}

KNOWN_EXCHANGES: set[str] = {a.lower() for a in _RAW}
EXCHANGE_LABELS: dict[str, str] = {a.lower(): label for a, label in _RAW.items()}


def is_known_exchange(address: str | None) -> bool:
    """True if the address is a curated CEX hot wallet or canonical bridge."""
    if not address:
        return False
    return address.lower() in KNOWN_EXCHANGES
