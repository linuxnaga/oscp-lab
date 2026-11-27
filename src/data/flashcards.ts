import type { Flashcard } from "@/types/oscp";

/*
 * High-yield OSCP flashcards.
 * Front: a tactical objective. Back: the tool and approach, a general usage
 * template for recon/enumeration tools, and what the key options mean.
 * Placeholders in angle brackets (<TARGET>, <DOMAIN>, ...) are yours to fill.
 */

export const FLASHCARDS: Flashcard[] = [
  // ---------------- Enumeration (8) ----------------
  {
    id: "fc-enum-01", category: "Enumeration",
    front: "Run a full TCP port scan quickly, then fingerprint only the open ports.",
    answer: "Two-pass nmap: a fast all-ports sweep, then default scripts and version detection on what's open.",
    syntax: "nmap -p- --min-rate 5000 -oN all.txt <TARGET>\nnmap -p <PORTS> -sC -sV -oN svc.txt <TARGET>",
    flags: [
      { flag: "-p-", meaning: "Scan all 65,535 TCP ports." },
      { flag: "--min-rate", meaning: "Send at least N packets/sec; speeds up the sweep." },
      { flag: "-sC / -sV", meaning: "Default NSE scripts / service version detection." },
      { flag: "-oN", meaning: "Save normal output; keep notes for the exam report." },
    ],
  },
  {
    id: "fc-enum-02", category: "Enumeration",
    front: "Check the most common UDP services you might miss with a TCP-only scan.",
    answer: "A top-ports UDP scan; SNMP (161), TFTP (69) and DNS (53) are the usual wins.",
    syntax: "sudo nmap -sU --top-ports 50 -oN udp.txt <TARGET>",
    flags: [
      { flag: "-sU", meaning: "UDP scan (requires root)." },
      { flag: "--top-ports N", meaning: "Scan the N most common ports; UDP is slow, so keep N small." },
    ],
  },
  {
    id: "fc-enum-03", category: "Enumeration",
    front: "Brute-force hidden directories and files on a web server, recursively.",
    answer: "feroxbuster with a SecLists wordlist and relevant extensions.",
    syntax: "feroxbuster -u http://<TARGET> -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -x php,txt,bak",
    flags: [
      { flag: "-u", meaning: "Target URL." },
      { flag: "-w", meaning: "Wordlist." },
      { flag: "-x", meaning: "Extensions to append; include backup extensions like .bak/.old." },
    ],
  },
  {
    id: "fc-enum-04", category: "Enumeration",
    front: "Discover virtual hosts (subdomains) served by the same IP.",
    answer: "ffuf fuzzing the Host header, filtering out the default response size.",
    syntax: "ffuf -u http://<TARGET> -H 'Host: FUZZ.<DOMAIN>' -w subdomains-top1million-5000.txt -fs <SIZE>",
    flags: [
      { flag: "-H", meaning: "Custom header; FUZZ is the injection point." },
      { flag: "-fs", meaning: "Filter responses of this size (the default vhost)." },
    ],
    note: "Add discovered vhosts to /etc/hosts.",
  },
  {
    id: "fc-enum-05", category: "Enumeration",
    front: "Enumerate SMB shares with a null/guest session.",
    answer: "NetExec (nxc) share enumeration with an empty or guest user.",
    syntax: "nxc smb <TARGET> -u '' -p '' --shares\nnxc smb <TARGET> -u guest -p '' --shares",
    flags: [
      { flag: "-u '' -p ''", meaning: "Null session." },
      { flag: "--shares", meaning: "List shares and your READ/WRITE access." },
    ],
  },
  {
    id: "fc-enum-06", category: "Enumeration",
    front: "Enumerate domain users without credentials when null sessions are allowed.",
    answer: "RID brute-forcing with nxc, which walks SIDs to resolve account names.",
    syntax: "nxc smb <DC_IP> -u guest -p '' --rid-brute",
    flags: [{ flag: "--rid-brute", meaning: "Cycle RIDs to resolve user and group names." }],
  },
  {
    id: "fc-enum-07", category: "Enumeration",
    front: "Walk SNMP with the default 'public' community string.",
    answer: "snmpwalk against common OIDs (processes, software, users).",
    syntax: "snmpwalk -v2c -c public <TARGET>\nsnmpwalk -v2c -c public <TARGET> 1.3.6.1.2.1.25.4.2.1.2",
    flags: [
      { flag: "-v2c", meaning: "SNMP version." },
      { flag: "-c", meaning: "Community string." },
      { flag: "...25.4.2.1.2", meaning: "Running process names; command lines can leak creds." },
    ],
  },
  {
    id: "fc-enum-08", category: "Enumeration",
    front: "Find public exploits for a service version you fingerprinted.",
    answer: "searchsploit against the local Exploit-DB mirror; always read the code before running anything.",
    syntax: "searchsploit <PRODUCT> <VERSION>\nsearchsploit -m <EDB-ID>",
    flags: [{ flag: "-m", meaning: "Mirror (copy) the exploit to the current directory to read and adapt." }],
  },

  // ---------------- Web (7) ----------------
  {
    id: "fc-web-01", category: "Web",
    front: "You suspect SQL injection in a parameter. What's your methodology?",
    answer: "Confirm manually first (quote → error, boolean true/false, time delay), identify the DBMS, then enumerate with UNION or blind techniques. sqlmap is a tool to speed this up, but the exam rewards understanding it manually.",
    flags: [
      { flag: "Error-based", meaning: "DB errors leak structure." },
      { flag: "Boolean-based", meaning: "Page differs on true vs. false conditions." },
      { flag: "Time-based", meaning: "Only response time differs." },
    ],
  },
  {
    id: "fc-web-02", category: "Web",
    front: "How do you tell which template engine a server-side template injection point uses?",
    answer: "Send engine-specific arithmetic probes and compare what renders. Different engines evaluate different syntaxes (e.g. {{ }}, ${ }, <%= %>), and the PortSwigger SSTI decision tree narrows it down.",
    flags: [{ flag: "Decision tree", meaning: "Sequence of probes whose results identify the engine." }],
  },
  {
    id: "fc-web-03", category: "Web",
    front: "An upload form blocks .php. What checks should you test, in order?",
    answer: "Find out what's actually validated: Content-Type header, extension blacklist vs. allow-list, magic bytes, and whether server config files (.htaccess, web.config) can be uploaded. Then confirm where files land and whether they execute.",
    flags: [
      { flag: "Content-Type", meaning: "Client-controlled; never trustworthy alone." },
      { flag: "Magic bytes", meaning: "File signature at the start of the content." },
    ],
  },
  {
    id: "fc-web-04", category: "Web",
    front: "You have an LFI. Which files do you read first on Linux?",
    answer: "/etc/passwd (users), app config files (DB creds), ~/.ssh/id_rsa for each user, and readable logs. On Windows, look at C:\\Windows\\win.ini to confirm, then web.config and unattend files.",
    flags: [{ flag: "Traversal depth", meaning: "Use enough ../ to reach /; extra ones are harmless." }],
  },
  {
    id: "fc-web-05", category: "Web",
    front: "What makes a JWT forgeable?",
    answer: "Weak HMAC secrets (crackable offline), servers that accept alg=none, algorithm confusion (RS256 public key used as an HS256 secret), or unvalidated kid/jku headers. Decode the token first and test each condition.",
    flags: [
      { flag: "alg", meaning: "Signing algorithm in the header." },
      { flag: "kid / jku", meaning: "Key ID / key URL headers that may be attacker-influenced." },
    ],
  },
  {
    id: "fc-web-06", category: "Web",
    front: "Scan a WordPress site for vulnerable plugins and users.",
    answer: "wpscan with aggressive plugin detection and user enumeration.",
    syntax: "wpscan --url http://<TARGET> -e ap,u --plugins-detection aggressive",
    flags: [
      { flag: "-e ap,u", meaning: "Enumerate all plugins and users." },
      { flag: "--plugins-detection aggressive", meaning: "Probe plugin paths rather than relying on page source." },
    ],
  },
  {
    id: "fc-web-07", category: "Web",
    front: "How do you recognise serialized objects worth investigating?",
    answer: "Java: base64 starting rO0AB (hex AC ED 00 05). .NET: ViewState or base64 starting AAEAAAD/////. PHP: strings like O:4:\"User\":2:{...}. Python pickle: base64 starting gASV. Integrity-unprotected serialized data is a deserialization candidate.",
    flags: [{ flag: "rO0AB", meaning: "Base64 of the Java serialization magic." }],
  },

  // ---------------- Linux PrivEsc (7) ----------------
  {
    id: "fc-lin-01", category: "Linux PrivEsc",
    front: "First three things to check after landing a Linux shell?",
    answer: "id (groups like docker/lxd/adm), sudo -l (allowed commands and env_keep), then run linpeas for the full sweep.",
    syntax: "id; sudo -l\n./linpeas.sh | tee linpeas.txt",
    flags: [{ flag: "sudo -l", meaning: "Lists commands you may run as other users." }],
  },
  {
    id: "fc-lin-02", category: "Linux PrivEsc",
    front: "List SUID binaries on the system.",
    answer: "find with the SUID permission bit, then compare against GTFOBins.",
    syntax: "find / -perm -4000 -type f 2>/dev/null",
    flags: [
      { flag: "-perm -4000", meaning: "SUID bit set." },
      { flag: "2>/dev/null", meaning: "Hide permission-denied noise." },
    ],
  },
  {
    id: "fc-lin-03", category: "Linux PrivEsc",
    front: "Enumerate Linux file capabilities.",
    answer: "getcap recursively; watch for cap_setuid, cap_dac_read_search and cap_sys_admin on interpreters.",
    syntax: "getcap -r / 2>/dev/null",
    flags: [{ flag: "-r", meaning: "Recurse from the given path." }],
  },
  {
    id: "fc-lin-04", category: "Linux PrivEsc",
    front: "Watch for cron jobs and processes run by other users without root.",
    answer: "pspy monitors process creation via procfs; it catches short-lived cron jobs that ps misses.",
    syntax: "./pspy64",
    flags: [{ flag: "UID=0", meaning: "Lines marked UID=0 are processes running as root." }],
  },
  {
    id: "fc-lin-05", category: "Linux PrivEsc",
    front: "Why is a `tar ... *` in a root cron job dangerous?",
    answer: "The shell expands * to filenames before tar runs, so files named like command-line options are parsed as options. Fix it by using ./* or -- to end option parsing.",
    flags: [{ flag: "--", meaning: "Marks the end of options; following arguments are treated as files." }],
  },
  {
    id: "fc-lin-06", category: "Linux PrivEsc",
    front: "What does NFS no_root_squash allow?",
    answer: "Root on an NFS client keeps UID 0 on the share, so root-owned files (including SUID bits) created from the client persist on the server.",
    syntax: "showmount -e <TARGET>\ncat /etc/exports",
    flags: [{ flag: "root_squash", meaning: "Default: maps client root to nobody." }],
  },
  {
    id: "fc-lin-07", category: "Linux PrivEsc",
    front: "Why is docker or lxd group membership equivalent to root?",
    answer: "Members can start containers that bind-mount the host's / and run as root inside, giving read/write over the host filesystem.",
    flags: [{ flag: "id", meaning: "Shows group memberships; check this first." }],
  },

  // ---------------- Windows PrivEsc (7) ----------------
  {
    id: "fc-win-01", category: "Windows PrivEsc",
    front: "First checks after landing a Windows shell?",
    answer: "whoami /priv (token privileges), whoami /groups, systeminfo (build and patches), then winPEAS.",
    syntax: "whoami /priv\nwhoami /groups\nsysteminfo",
    flags: [{ flag: "/priv", meaning: "Shows privileges like SeImpersonate, SeBackup, SeDebug." }],
  },
  {
    id: "fc-win-02", category: "Windows PrivEsc",
    front: "You see SeImpersonatePrivilege enabled. What class of attack applies?",
    answer: "Potato attacks (GodPotato, PrintSpoofer, JuicyPotatoNG) coerce a SYSTEM authentication locally and impersonate the resulting token. Pick the variant that matches the Windows build.",
    flags: [{ flag: "SeImpersonate", meaning: "Common on IIS, MSSQL and other service accounts." }],
  },
  {
    id: "fc-win-03", category: "Windows PrivEsc",
    front: "Find services with unquoted paths.",
    answer: "Query service paths and filter out quoted and Windows-folder paths, then check ACLs on each intermediate directory.",
    syntax: "wmic service get name,pathname,startmode | findstr /i /v \"C:\\Windows\\\\\" | findstr /i /v \"\"\"",
    flags: [{ flag: "icacls <DIR>", meaning: "Check if your user can write to each path segment." }],
  },
  {
    id: "fc-win-04", category: "Windows PrivEsc",
    front: "Check whether AlwaysInstallElevated is enabled.",
    answer: "Both HKLM and HKCU values must equal 1.",
    syntax: "reg query HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated\nreg query HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated",
    flags: [{ flag: "0x1", meaning: "Enabled. Both hives must show it." }],
  },
  {
    id: "fc-win-05", category: "Windows PrivEsc",
    front: "Check a service's permissions for your user.",
    answer: "accesschk (Sysinternals) shows service DACLs; SERVICE_CHANGE_CONFIG or SERVICE_ALL_ACCESS for your user is the finding.",
    syntax: "accesschk.exe /accepteula -uwcqv <USER> *\nsc qc <SERVICE>",
    flags: [
      { flag: "-c", meaning: "Target is a service." },
      { flag: "-w", meaning: "Show only write access." },
    ],
  },
  {
    id: "fc-win-06", category: "Windows PrivEsc",
    front: "Where do Windows admins accidentally leave passwords?",
    answer: "PowerShell history (ConsoleHost_history.txt), C:\\Windows\\Panther\\Unattend.xml, web.config files, saved credentials (cmdkey /list), and scripts on shares.",
    syntax: "type $env:APPDATA\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt\ncmdkey /list",
    flags: [{ flag: "cmdkey /list", meaning: "Shows stored credentials usable with runas /savecred." }],
  },
  {
    id: "fc-win-07", category: "Windows PrivEsc",
    front: "What does SeBackupPrivilege let you do?",
    answer: "Read any file regardless of its ACL, including the SAM and SYSTEM hives (and NTDS.dit on a DC), which can then be parsed offline for hashes.",
    flags: [{ flag: "Backup Operators", meaning: "Group that grants SeBackup/SeRestore." }],
  },

  // ---------------- Active Directory (8) ----------------
  {
    id: "fc-ad-01", category: "Active Directory",
    front: "Validate a list of usernames against Kerberos without locking accounts.",
    answer: "kerbrute userenum checks pre-auth responses; it doesn't count as a failed logon.",
    syntax: "kerbrute userenum -d <DOMAIN> --dc <DC_IP> users.txt",
    flags: [{ flag: "userenum", meaning: "Username validation via Kerberos AS-REQ." }],
  },
  {
    id: "fc-ad-02", category: "Active Directory",
    front: "Find users with Kerberos pre-authentication disabled (AS-REP Roasting).",
    answer: "impacket-GetNPUsers requests AS-REPs for each user; crack results with hashcat mode 18200.",
    syntax: "impacket-GetNPUsers <DOMAIN>/ -usersfile users.txt -dc-ip <DC_IP> -format hashcat",
    flags: [
      { flag: "-usersfile", meaning: "List of usernames to test." },
      { flag: "-format hashcat", meaning: "Output in hashcat-ready format." },
    ],
  },
  {
    id: "fc-ad-03", category: "Active Directory",
    front: "Kerberoast service accounts with a valid domain user.",
    answer: "impacket-GetUserSPNs lists SPN accounts and requests TGS tickets; crack with hashcat mode 13100.",
    syntax: "impacket-GetUserSPNs <DOMAIN>/<USER>:<PASS> -dc-ip <DC_IP> -request",
    flags: [{ flag: "-request", meaning: "Request TGS tickets for each SPN account." }],
  },
  {
    id: "fc-ad-04", category: "Active Directory",
    front: "Collect BloodHound data remotely from Kali.",
    answer: "bloodhound-python (or the CE-compatible collector) with any domain user, then import into BloodHound CE.",
    syntax: "bloodhound-python -d <DOMAIN> -u <USER> -p <PASS> -ns <DC_IP> -c All --zip",
    flags: [
      { flag: "-c All", meaning: "Collect all methods (groups, sessions, ACLs, trusts)." },
      { flag: "-ns", meaning: "DNS server to use (usually the DC)." },
    ],
  },
  {
    id: "fc-ad-05", category: "Active Directory",
    front: "Password-spray a domain safely.",
    answer: "Read the lockout policy first, then spray a single password across all users with nxc, staying under the threshold.",
    syntax: "nxc smb <DC_IP> -u <USER> -p <PASS> --pass-pol\nnxc smb <DC_IP> -u users.txt -p '<PASSWORD>' --continue-on-success",
    flags: [
      { flag: "--pass-pol", meaning: "Shows lockout threshold and window." },
      { flag: "--continue-on-success", meaning: "Don't stop at the first hit." },
    ],
  },
  {
    id: "fc-ad-06", category: "Active Directory",
    front: "What rights does DCSync require?",
    answer: "DS-Replication-Get-Changes and DS-Replication-Get-Changes-All on the domain object. Domain Admins, Enterprise Admins and DCs have them; WriteDacl on the domain can grant them.",
    flags: [{ flag: "secretsdump -just-dc", meaning: "Impacket's DCSync mode." }],
  },
  {
    id: "fc-ad-07", category: "Active Directory",
    front: "Find vulnerable AD CS certificate templates.",
    answer: "certipy-ad find with -vulnerable flags ESC1–ESC8 conditions.",
    syntax: "certipy-ad find -u <USER>@<DOMAIN> -p <PASS> -dc-ip <DC_IP> -vulnerable -stdout",
    flags: [
      { flag: "-vulnerable", meaning: "Show only templates/CAs with known misconfigurations." },
      { flag: "-stdout", meaning: "Print results instead of only writing files." },
    ],
  },
  {
    id: "fc-ad-08", category: "Active Directory",
    front: "List the ESC1 conditions.",
    answer: "Low-privileged users can enroll, the template has a client-authentication EKU, manager approval is off, no authorised signatures are required, and ENROLLEE_SUPPLIES_SUBJECT is set.",
    flags: [{ flag: "ENROLLEE_SUPPLIES_SUBJECT", meaning: "Requester chooses the certificate subject/SAN." }],
  },

  // ---------------- Tunneling (6) ----------------
  {
    id: "fc-tun-01", category: "Tunneling",
    front: "Set up a Ligolo-ng tunnel into an internal subnet.",
    answer: "Run the proxy on Kali and the agent on the pivot, select the session, start the tunnel, then add a route for the internal subnet via the ligolo interface.",
    syntax: "sudo ip tuntap add user $(whoami) mode tun ligolo && sudo ip link set ligolo up\n./proxy -selfcert\n./agent -connect <KALI_IP>:11601 -ignore-cert   # on pivot\nsudo ip route add <INTERNAL_CIDR> dev ligolo",
    flags: [
      { flag: "-selfcert", meaning: "Proxy generates a self-signed cert (lab use)." },
      { flag: "ip route add", meaning: "Route the internal subnet through the TUN interface." },
    ],
  },
  {
    id: "fc-tun-02", category: "Tunneling",
    front: "Reach a service bound to 127.0.0.1 on the target from your Kali box.",
    answer: "SSH local port forward.",
    syntax: "ssh -L 8080:127.0.0.1:8080 <USER>@<TARGET>",
    flags: [{ flag: "-L local:host:port", meaning: "Listen locally and forward to host:port from the remote side." }],
  },
  {
    id: "fc-tun-03", category: "Tunneling",
    front: "Get a SOCKS proxy through an SSH foothold.",
    answer: "SSH dynamic port forwarding plus proxychains.",
    syntax: "ssh -D 1080 -N <USER>@<PIVOT>\n# /etc/proxychains4.conf -> socks5 127.0.0.1 1080\nproxychains nmap -sT -Pn -p 445 <INTERNAL_IP>",
    flags: [
      { flag: "-D", meaning: "Dynamic (SOCKS) forward." },
      { flag: "-N", meaning: "No remote command; tunnel only." },
      { flag: "-sT -Pn", meaning: "Full connect scan, no ping; SOCKS only carries TCP." },
    ],
  },
  {
    id: "fc-tun-04", category: "Tunneling",
    front: "Create a reverse SOCKS proxy from a Windows pivot with no SSH.",
    answer: "Chisel: server in reverse mode on Kali, client on the pivot connecting back.",
    syntax: "chisel server -p 8000 --reverse            # Kali\nchisel.exe client <KALI_IP>:8000 R:socks     # pivot",
    flags: [
      { flag: "--reverse", meaning: "Allow clients to open listeners on the server." },
      { flag: "R:socks", meaning: "Reverse SOCKS5 on the server (default port 1080)." },
    ],
  },
  {
    id: "fc-tun-05", category: "Tunneling",
    front: "Relay a single TCP port through a pivot with no tunnelling tools installed.",
    answer: "socat (Linux) or netsh interface portproxy (Windows, admin required).",
    syntax: "socat TCP-LISTEN:8443,fork TCP:<INTERNAL_IP>:443\nnetsh interface portproxy add v4tov4 listenport=8443 listenaddress=0.0.0.0 connectport=443 connectaddress=<INTERNAL_IP>",
    flags: [
      { flag: "fork", meaning: "Handle multiple connections." },
      { flag: "portproxy", meaning: "Native Windows port forwarding (check the firewall too)." },
    ],
  },
  {
    id: "fc-tun-06", category: "Tunneling",
    front: "What's the difference between -L, -R and -D in SSH?",
    answer: "-L opens a port on your side that forwards into the remote network. -R opens a port on the remote side that forwards back to you. -D gives you a SOCKS proxy that routes anything through the remote host.",
    flags: [{ flag: "GatewayPorts", meaning: "sshd option controlling whether -R listeners bind beyond localhost." }],
  },
];

export const FLASHCARDS_BY_ID: Record<string, Flashcard> = Object.fromEntries(FLASHCARDS.map((c) => [c.id, c]));
