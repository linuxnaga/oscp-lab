import type { ExamQuestion } from "@/types/oscp";

/*
 * Scenario-based exam questions. Each shows realistic enumeration output and
 * asks for the best next step. The answers test methodology and reasoning:
 * recognising the vector and choosing the right technique and tool.
 */

export const QUESTIONS: ExamQuestion[] = [
  {
    id: "q-01", category: "Linux PrivEsc", title: "Sudo on a pager",
    scenario: "You have a shell as www-data on a Ubuntu web server.",
    terminalLabel: "sudo -l",
    terminal: `Matching Defaults entries for www-data on inkwell:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\\:/usr/local/bin\\:/usr/sbin\\:/usr/bin\\:/sbin\\:/bin

User www-data may run the following commands on inkwell:
    (root) NOPASSWD: /usr/bin/less /var/log/apache2/access.log`,
    question: "What is the most direct path to root?",
    options: [
      "Use less's ability to run shell commands from inside the pager (GTFOBins 'Sudo' entry).",
      "Poison access.log with PHP and include it through the web app.",
      "Overwrite /usr/bin/less with a malicious binary.",
      "Run a kernel exploit, because sudo is restricted to a single file.",
    ],
    correctIndex: 0,
    explanation: "less can spawn a shell from within the pager. Running it via sudo as root means that shell inherits root, regardless of which file argument is fixed. GTFOBins lists this under less → Sudo.",
    rationale: [
      "Correct: pagers with shell escapes are a classic sudo misconfiguration.",
      "Log poisoning yields code execution as www-data, which you already have.",
      "/usr/bin/less is root-owned; www-data can't write to it.",
      "Kernel exploits are a last resort, and a clean misconfiguration is right there.",
    ],
  },
  {
    id: "q-02", category: "Windows PrivEsc", title: "IIS service account privileges",
    scenario: "You landed a web shell on IIS 10 running Windows Server 2019.",
    terminalLabel: "whoami /priv",
    terminal: `PRIVILEGES INFORMATION
----------------------
Privilege Name                Description                               State
============================= ========================================= ========
SeAssignPrimaryTokenPrivilege Replace a process level token             Disabled
SeIncreaseQuotaPrivilege      Adjust memory quotas for a process        Disabled
SeAuditPrivilege              Generate security audits                  Disabled
SeChangeNotifyPrivilege       Bypass traverse checking                  Enabled
SeImpersonatePrivilege        Impersonate a client after authentication Enabled
SeCreateGlobalPrivilege       Create global objects                     Enabled`,
    question: "Which technique family is the best fit?",
    options: [
      "Mimikatz sekurlsa::logonpasswords",
      "A Potato-style token impersonation attack (e.g. GodPotato or PrintSpoofer)",
      "Unquoted service path exploitation",
      "Pass-the-hash with the AppPool account's NTLM hash",
    ],
    correctIndex: 1,
    explanation: "SeImpersonatePrivilege lets the process impersonate any token it can obtain. Potato attacks coerce a local SYSTEM authentication and impersonate it. GodPotato and PrintSpoofer both work on Server 2019.",
    rationale: [
      "Mimikatz needs SeDebugPrivilege/admin to read LSASS, which you don't have.",
      "Correct: SeImpersonate + service account = Potato.",
      "Nothing in the output suggests a vulnerable service path; that's a separate enumeration.",
      "AppPool virtual accounts aren't useful for PtH, and you'd still be the same low-privileged identity.",
    ],
  },
  {
    id: "q-03", category: "Active Directory", title: "BloodHound edge to Domain Admins",
    scenario: "BloodHound shows a path from your owned user, j.ramirez.",
    terminalLabel: "BloodHound CE — Shortest Path",
    terminal: `J.RAMIREZ@CORP.LOCAL
   └─[MemberOf]──▶ HELPDESK@CORP.LOCAL
                     └─[GenericAll]──▶ IT-ADMINS@CORP.LOCAL
                                         └─[MemberOf]──▶ DOMAIN ADMINS@CORP.LOCAL`,
    question: "What does GenericAll on the IT-ADMINS group let you do?",
    options: [
      "Only read the group's membership",
      "Add your own user to IT-ADMINS, which is nested in Domain Admins",
      "Reset the krbtgt password",
      "Nothing until you obtain WriteOwner",
    ],
    correctIndex: 1,
    explanation: "GenericAll is full control over the object. On a group that includes modifying the member attribute, so you can add yourself. Because IT-ADMINS is a member of Domain Admins, you inherit DA rights after a new logon/ticket.",
    rationale: [
      "Any domain user can read membership; GenericAll is far more.",
      "Correct: full control on a group includes adding members.",
      "krbtgt is a separate object; GenericAll on a group doesn't extend to it.",
      "GenericAll already includes the rights WriteOwner would let you grant yourself.",
    ],
  },
  {
    id: "q-04", category: "Web Exploitation", title: "Template engine fingerprint",
    scenario: "A Flask app renders a 'Hello, NAME' greeting card. You test the name field.",
    terminalLabel: "curl",
    terminal: `$ curl -s 'http://10.10.11.12:5000/card?name={{7*7}}' | grep Hello
<h1>Hello, 49</h1>
$ curl -s "http://10.10.11.12:5000/card?name={{7*'7'}}" | grep Hello
<h1>Hello, 7777777</h1>`,
    question: "What do these results indicate?",
    options: [
      "Reflected XSS only; the server does nothing special",
      "Server-side template injection in Jinja2",
      "SQL injection, because arithmetic was evaluated",
      "Twig SSTI, because 7*'7' returned 49",
    ],
    correctIndex: 1,
    explanation: "Arithmetic evaluated server-side means template injection. 7*'7' returning 7777777 (string repetition) is Python behaviour, which together with Flask points to Jinja2. Twig would return 49.",
    rationale: [
      "XSS wouldn't compute 49; evaluation happened server-side.",
      "Correct: evaluated expressions plus Python string semantics → Jinja2.",
      "SQL engines don't render template expressions into HTML like this.",
      "That's backwards: Twig returns 49 for 7*'7', and Jinja2 returns 7777777.",
    ],
  },
  {
    id: "q-05", category: "Active Directory", title: "Kerberos pre-auth",
    scenario: "You have a validated user list but no passwords for the domain htb.local.",
    terminalLabel: "kerbrute / GetNPUsers",
    terminal: `$ kerbrute userenum -d htb.local --dc 10.10.11.161 users.txt
[+] VALID USERNAME:  svc-alfresco@htb.local
[+] VALID USERNAME:  sebastien@htb.local
[+] VALID USERNAME:  lucinda@htb.local

$ impacket-GetNPUsers htb.local/ -usersfile valid.txt -dc-ip 10.10.11.161 -format hashcat
[-] User sebastien doesn't have UF_DONT_REQUIRE_PREAUTH set
$krb5asrep$23$svc-alfresco@HTB.LOCAL:3c1f...`,
    question: "What's the next step?",
    options: [
      "Kerberoast svc-alfresco with GetUserSPNs",
      "Crack the AS-REP hash offline with hashcat mode 18200",
      "Pass the hash directly to WinRM",
      "Spray 'Password1' against all three accounts",
    ],
    correctIndex: 1,
    explanation: "The $krb5asrep$23$ value is an AS-REP encrypted with a key derived from the user's password. It's crackable offline (hashcat -m 18200) with no lockout risk.",
    rationale: [
      "Kerberoasting needs valid credentials first, and you have none yet.",
      "Correct: offline cracking of the AS-REP.",
      "An AS-REP hash is not an NTLM hash and can't be passed.",
      "Spraying risks lockouts when you already have an offline-crackable hash.",
    ],
  },
  {
    id: "q-06", category: "Linux PrivEsc", title: "Capabilities output",
    scenario: "linpeas highlights a file capability in red/yellow.",
    terminalLabel: "getcap -r / 2>/dev/null",
    terminal: `/usr/bin/ping cap_net_raw=ep
/usr/bin/mtr-packet cap_net_raw=ep
/usr/local/bin/python3.10 cap_setuid=ep`,
    question: "Which entry is the privilege escalation vector and why?",
    options: [
      "ping: cap_net_raw allows raw packets as root",
      "python3.10: cap_setuid lets the interpreter set its UID to 0",
      "mtr-packet: it is non-standard",
      "None. Capabilities can't lead to root without SUID",
    ],
    correctIndex: 1,
    explanation: "cap_setuid allows a process to change its UID arbitrarily. An interpreter with it can set UID 0 and spawn a root shell. GTFOBins lists Python under Capabilities.",
    rationale: [
      "cap_net_raw on ping is standard and only grants raw sockets.",
      "Correct: cap_setuid on an interpreter is equivalent to root.",
      "mtr-packet with cap_net_raw is a standard package default.",
      "Capabilities split root's powers; some of them (setuid) are enough on their own.",
    ],
  },
  {
    id: "q-07", category: "Windows PrivEsc", title: "Unquoted service path",
    scenario: "winPEAS flags a service. You check the folder permissions.",
    terminalLabel: "sc qc / icacls",
    terminal: `C:\\> sc qc PrintMgr
        BINARY_PATH_NAME   : C:\\Program Files\\Print Manager\\Spool Service\\printmgr.exe
        SERVICE_START_NAME : LocalSystem
        START_TYPE         : 2   AUTO_START

C:\\> icacls "C:\\Program Files"
C:\\Program Files NT SERVICE\\TrustedInstaller:(F)  BUILTIN\\Users:(RX)

C:\\> icacls "C:\\Program Files\\Print Manager"
C:\\Program Files\\Print Manager BUILTIN\\Users:(W)  NT AUTHORITY\\SYSTEM:(F)`,
    question: "Which planted executable would the service launch as SYSTEM on next start?",
    options: [
      "C:\\Program Files\\Print Manager\\Spool.exe",
      "C:\\Program.exe",
      "C:\\Windows\\System32\\printmgr.exe",
      "C:\\Program Files\\Print.exe",
    ],
    correctIndex: 0,
    explanation: "With an unquoted path, Windows tries each space-delimited prefix plus .exe in order: C:\\Program.exe, C:\\Program Files\\Print.exe, C:\\Program Files\\Print Manager\\Spool.exe, then the real binary. Only the Print Manager folder is writable by Users, so Spool.exe is the prefix you can control.",
    rationale: [
      "Correct: it's a resolution candidate and its folder is writable by Users.",
      "It's a candidate, but Users can't write to C:\\.",
      "System32 isn't part of unquoted-path resolution.",
      "It's a candidate, but C:\\Program Files is read-only for Users.",
    ],
  },
  {
    id: "q-08", category: "Pivoting & Tunneling", title: "Dual-homed host",
    scenario: "You have root on a DMZ web server.",
    terminalLabel: "ip a",
    terminal: `2: ens160: <BROADCAST,MULTICAST,UP> mtu 1500
    inet 10.10.11.45/24 brd 10.10.11.255 scope global ens160
3: ens192: <BROADCAST,MULTICAST,UP> mtu 1500
    inet 172.16.20.5/24 brd 172.16.20.255 scope global ens192`,
    question: "What's the cleanest way to run your full Kali toolset against 172.16.20.0/24?",
    options: [
      "Upload nmap to the pivot and run everything from there",
      "Set up Ligolo-ng and add a route for 172.16.20.0/24 via the ligolo TUN interface",
      "Use SSH -L for each internal port you guess might be open",
      "Add 172.16.20.0/24 to /etc/hosts",
    ],
    correctIndex: 1,
    explanation: "Ligolo-ng gives you a routed TUN interface: once the route is added, every Kali tool reaches the internal subnet natively (no proxychains, and full TCP/UDP/ICMP support).",
    rationale: [
      "Possible, but you lose your tooling and leave artefacts on the pivot.",
      "Correct: a routed tunnel is the most flexible.",
      "Local forwards need you to know the ports in advance and don't scale.",
      "/etc/hosts maps names to IPs; it doesn't provide routing.",
    ],
  },
  {
    id: "q-09", category: "Active Directory", title: "SMB signing and relay",
    scenario: "Responder is capturing NetNTLMv2 hashes from a scripted user, but they won't crack.",
    terminalLabel: "nxc smb --gen-relay-list",
    terminal: `SMB  172.16.5.5   445  DC01    [*] Windows Server 2022 (signing:True)  (SMBv1:False)
SMB  172.16.5.21  445  WS01    [*] Windows 10 (signing:False) (SMBv1:False)
SMB  172.16.5.22  445  WS02    [*] Windows 10 (signing:False) (SMBv1:False)`,
    question: "What's the best use of the captured authentication?",
    options: [
      "Relay it to DC01 with ntlmrelayx",
      "Relay it to WS01/WS02 with ntlmrelayx, where signing is off",
      "Pass the NetNTLMv2 hash with nxc",
      "Keep cracking with larger wordlists; relay isn't possible",
    ],
    correctIndex: 1,
    explanation: "SMB relay needs a target that doesn't require signing. WS01/WS02 qualify, and if the relayed user is a local admin there you get admin access. The DC requires signing.",
    rationale: [
      "DC01 has signing required, so the relay will fail.",
      "Correct: relay to hosts with signing disabled.",
      "NetNTLMv2 is a challenge-response, not an NTLM hash; it can't be passed.",
      "Relay is possible, as the signing:False hosts show.",
    ],
  },
  {
    id: "q-10", category: "Web Exploitation", title: "Upload validation",
    scenario: "An image upload accepts shell.php when you change one thing in Burp.",
    terminalLabel: "Burp Repeater",
    terminal: `POST /upload.php HTTP/1.1
Content-Type: multipart/form-data; boundary=----x
------x
Content-Disposition: form-data; name="file"; filename="shell.php"
Content-Type: image/png

<?php echo "test"; ?>
------x--

HTTP/1.1 200 OK
{"status":"ok","path":"/uploads/shell.php"}`,
    question: "What validation is the server doing?",
    options: [
      "Magic-byte checking of the file content",
      "Only the client-supplied Content-Type header",
      "An extension allow-list",
      "Server-side antivirus scanning",
    ],
    correctIndex: 1,
    explanation: "The content is plain PHP with no PNG signature and the extension is .php, yet it was accepted with Content-Type: image/png. The only thing that changed is the header, which the client controls.",
    rationale: [
      "No PNG magic bytes were present, so magic-byte checks would have failed.",
      "Correct: the header is the only check.",
      ".php would fail an image allow-list.",
      "Nothing indicates scanning; the file was stored as-is.",
    ],
  },
  {
    id: "q-11", category: "Linux PrivEsc", title: "Root cron with tar",
    scenario: "pspy shows a recurring job.",
    terminalLabel: "pspy64",
    terminal: `2026/03/14 10:01:01 CMD: UID=0  PID=2210 | /bin/sh -c cd /var/www/html/uploads && tar czf /backups/uploads.tgz *
2026/03/14 10:02:01 CMD: UID=0  PID=2231 | /bin/sh -c cd /var/www/html/uploads && tar czf /backups/uploads.tgz *`,
    question: "Why is this exploitable if www-data can write to /uploads?",
    options: [
      "tar always runs as SUID",
      "The shell expands * into filenames, and files named like tar options are parsed as options",
      "/backups is world-writable",
      "gzip compression can be abused for code execution",
    ],
    correctIndex: 1,
    explanation: "Wildcard expansion happens before tar sees its arguments. A file whose name starts with -- becomes an option, and tar has checkpoint options that execute commands. This is wildcard injection.",
    rationale: [
      "tar isn't SUID; it's running as root because cron runs it as root.",
      "Correct: glob-expanded filenames become arguments.",
      "Nothing indicates /backups permissions matter.",
      "Compression isn't the issue; argument parsing is.",
    ],
  },
  {
    id: "q-12", category: "Active Directory", title: "Kerberoastable account",
    scenario: "You have creds for a low-privilege user.",
    terminalLabel: "impacket-GetUserSPNs",
    terminal: `ServicePrincipalName            Name       MemberOf                                   PasswordLastSet
------------------------------  ---------  -----------------------------------------  -------------------
MSSQLSvc/sql01.corp.local:1433  svc_sql    CN=SQL Admins,CN=Users,DC=corp,DC=local    2019-02-11 09:14:02
HTTP/web01.corp.local           svc_web                                               2025-11-01 16:40:51`,
    question: "Which account is the better Kerberoasting target and why?",
    options: [
      "svc_web, because HTTP services are weaker",
      "svc_sql: the password hasn't changed since 2019, so it's likely human-chosen and crackable, and it's in a privileged group",
      "Neither; Kerberoasting requires Domain Admin",
      "Both equally; PasswordLastSet is irrelevant",
    ],
    correctIndex: 1,
    explanation: "Old, never-rotated service passwords are often weak and human-chosen. svc_sql also belongs to SQL Admins, so cracking it has more impact. Any domain user can request the TGS.",
    rationale: [
      "Service type doesn't determine password strength.",
      "Correct: password age plus privilege makes it the priority.",
      "Any authenticated user can Kerberoast.",
      "Password age is a strong signal of crackability.",
    ],
  },
  {
    id: "q-13", category: "Windows PrivEsc", title: "AlwaysInstallElevated",
    scenario: "You check Windows Installer policy.",
    terminalLabel: "reg query",
    terminal: `HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer
    AlwaysInstallElevated    REG_DWORD    0x1

HKEY_CURRENT_USER\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer
    AlwaysInstallElevated    REG_DWORD    0x1`,
    question: "What does this configuration allow?",
    options: [
      "Nothing; only one hive matters",
      "Any user can install an MSI package that runs with SYSTEM privileges",
      "Users can install drivers",
      "Users can modify the registry as SYSTEM",
    ],
    correctIndex: 1,
    explanation: "When both HKLM and HKCU have AlwaysInstallElevated=1, Windows Installer runs every MSI with elevated (SYSTEM) privileges, including custom actions inside the package.",
    rationale: [
      "Both hives must be set, and here they are.",
      "Correct: MSI installs run as SYSTEM.",
      "Driver installation is a separate privilege.",
      "It affects msiexec, not general registry access.",
    ],
  },
  {
    id: "q-14", category: "Active Directory", title: "ADCS template",
    scenario: "certipy flags a template.",
    terminalLabel: "certipy-ad find -vulnerable",
    terminal: `Template Name                       : CorpUserAuth
Enabled                             : True
Client Authentication               : True
Enrollee Supplies Subject           : True
Requires Manager Approval           : False
Authorized Signatures Required      : 0
Permissions
  Enrollment Rights                 : CORP.LOCAL\\Domain Users
[!] Vulnerabilities
  ESC1                              : 'CORP.LOCAL\\Domain Users' can enroll, enrollee supplies subject and template allows client authentication`,
    question: "Why is this template dangerous?",
    options: [
      "It allows web server certificates",
      "Any domain user can request a client-auth certificate naming any other user (e.g. Administrator) and authenticate as them",
      "It leaks the CA private key",
      "It only matters if you already have Domain Admin",
    ],
    correctIndex: 1,
    explanation: "ESC1: Domain Users can enroll, the requester chooses the subject/SAN, the cert is valid for client authentication, and no approval is needed. A certificate for Administrator can be used for PKINIT to obtain their TGT/NT hash.",
    rationale: [
      "Server authentication isn't the issue; client authentication is.",
      "Correct: subject impersonation via ESC1.",
      "The CA key isn't exposed; that would be a different finding.",
      "Domain Users can enroll, so this is a privilege escalation from any user.",
    ],
  },
  {
    id: "q-15", category: "Linux PrivEsc", title: "NFS exports",
    scenario: "You read the exports file from your low-privileged shell.",
    terminalLabel: "cat /etc/exports",
    terminal: `/home/backup   *(rw,sync,no_root_squash,no_subtree_check)
/srv/share     10.10.11.0/24(ro,sync,root_squash)`,
    question: "Which export enables privilege escalation from your attack box?",
    options: [
      "/srv/share, because it's restricted to your subnet",
      "/home/backup, because no_root_squash keeps client root as UID 0 on the share",
      "Neither, NFS is read-only",
      "Both, because sync is enabled",
    ],
    correctIndex: 1,
    explanation: "With no_root_squash, files you create as root from your own machine stay root-owned on the server, including SUID bits. /home/backup is rw for everyone, so this works.",
    rationale: [
      "/srv/share is read-only and squashes root.",
      "Correct: rw + no_root_squash.",
      "/home/backup is rw.",
      "sync controls write behaviour, not security.",
    ],
  },
  {
    id: "q-16", category: "Active Directory", title: "Password policy before spraying",
    scenario: "You're about to spray a seasonal password.",
    terminalLabel: "nxc smb --pass-pol",
    terminal: `SMB  10.10.11.5  445  DC01  [+] Dumping password info for domain: CORP
SMB  10.10.11.5  445  DC01  Minimum password length: 7
SMB  10.10.11.5  445  DC01  Account Lockout Threshold: 5
SMB  10.10.11.5  445  DC01  Locked Account Duration: 30 minutes
SMB  10.10.11.5  445  DC01  Reset Account Lockout Counter: 30 minutes`,
    question: "What's a safe spraying approach?",
    options: [
      "Try 10 passwords per user right away",
      "Spray one or two passwords per user, then wait 30+ minutes before the next round",
      "Lockout doesn't apply to Kerberos, so spray freely with kerbrute",
      "Disable lockout first with nxc",
    ],
    correctIndex: 1,
    explanation: "With a threshold of 5 and a 30-minute reset window, staying well below 5 attempts per window avoids lockouts. Kerberos pre-auth failures also count towards lockout.",
    rationale: [
      "10 attempts would lock every account at attempt 5.",
      "Correct: stay under the threshold per observation window.",
      "Kerberos pre-auth failures do increment badPwdCount.",
      "You can't change domain policy without admin rights.",
    ],
  },
  {
    id: "q-17", category: "Web Exploitation", title: "LFI confirmation",
    scenario: "A ?page= parameter includes PHP files.",
    terminalLabel: "curl",
    terminal: `$ curl -s 'http://10.10.11.30/index.php?page=../../../../etc/passwd' | head -4
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
alice:x:1000:1000:Alice,,,:/home/alice:/bin/bash`,
    question: "What's the highest-value next read?",
    options: [
      "/etc/shadow",
      "/home/alice/.ssh/id_rsa and the app's config files",
      "/proc/cpuinfo",
      "/etc/hostname",
    ],
    correctIndex: 1,
    explanation: "alice is the only human user with a shell. Her private key (if readable) gives SSH directly; app configs often hold DB creds that are reused. www-data typically can't read /etc/shadow.",
    rationale: [
      "/etc/shadow is root-readable only.",
      "Correct: keys and configs lead to access.",
      "CPU info doesn't help with access.",
      "The hostname is low value.",
    ],
  },
  {
    id: "q-18", category: "Pivoting & Tunneling", title: "Localhost-only service",
    scenario: "You SSH in as a low-privileged user.",
    terminalLabel: "ss -tlnp",
    terminal: `State   Recv-Q  Send-Q   Local Address:Port   Peer Address:Port
LISTEN  0       128          0.0.0.0:22          0.0.0.0:*
LISTEN  0       511        127.0.0.1:8080        0.0.0.0:*
LISTEN  0       80         127.0.0.1:3306        0.0.0.0:*`,
    question: "How do you browse the 8080 service from Kali?",
    options: [
      "ssh -L 8080:127.0.0.1:8080 user@target, then open http://127.0.0.1:8080",
      "ssh -R 8080:127.0.0.1:8080 user@target",
      "Browse to http://target:8080 directly",
      "ssh -D 8080 user@target",
    ],
    correctIndex: 0,
    explanation: "A local forward listens on your Kali box and forwards through SSH to 127.0.0.1:8080 as seen from the target.",
    rationale: [
      "Correct: -L brings a remote-local service to you.",
      "-R works in the opposite direction (target → you).",
      "It's bound to localhost on the target, so it's unreachable externally.",
      "-D creates a SOCKS proxy on 8080 rather than a direct forward (workable but not the direct answer).",
    ],
  },
  {
    id: "q-19", category: "Windows PrivEsc", title: "SeBackupPrivilege",
    scenario: "Your WinRM user is in Backup Operators.",
    terminalLabel: "whoami /priv",
    terminal: `Privilege Name                Description                    State
============================= ============================== =======
SeMachineAccountPrivilege     Add workstations to domain     Enabled
SeBackupPrivilege             Back up files and directories  Enabled
SeRestorePrivilege            Restore files and directories  Enabled
SeShutdownPrivilege           Shut down the system           Enabled
SeChangeNotifyPrivilege       Bypass traverse checking       Enabled`,
    question: "What's the most reliable path to admin hashes on a member server?",
    options: [
      "Save the SAM and SYSTEM hives and extract hashes offline",
      "Run a Potato attack",
      "Kerberoast the machine account",
      "Use SeShutdownPrivilege to reboot into safe mode",
    ],
    correctIndex: 0,
    explanation: "SeBackupPrivilege bypasses file ACLs for read. Saving SAM and SYSTEM lets you extract local hashes offline (e.g. with impacket-secretsdump LOCAL).",
    rationale: [
      "Correct: read-anything → registry hives → hashes.",
      "Potatoes require SeImpersonate, which isn't listed.",
      "Machine accounts have random 120-char passwords; not crackable.",
      "Shutdown privilege doesn't give a boot-time attack path remotely.",
    ],
  },
  {
    id: "q-20", category: "Active Directory", title: "DCSync rights",
    scenario: "BloodHound shows an edge from your owned group.",
    terminalLabel: "BloodHound CE — Edge",
    terminal: `SQL-OPS@CORP.LOCAL ──[WriteDacl]──▶ CORP.LOCAL (Domain)`,
    question: "How does WriteDacl on the domain object lead to full compromise?",
    options: [
      "It lets you reset any password directly",
      "You can grant yourself the replication rights needed for DCSync, then pull all hashes",
      "It lets you log on to the DC interactively",
      "It only allows reading ACLs",
    ],
    correctIndex: 1,
    explanation: "WriteDacl lets you modify the domain object's ACL. Adding DS-Replication-Get-Changes and -All for your user enables DCSync (e.g. impacket-secretsdump), which retrieves every hash including krbtgt.",
    rationale: [
      "Password resets require rights on user objects, not the domain object.",
      "Correct: WriteDacl → replication rights → DCSync.",
      "Logon rights are controlled separately.",
      "Reading ACLs needs no special rights; WriteDacl is a write.",
    ],
  },
  {
    id: "q-21", category: "Exam Chains", title: "Order of operations",
    scenario: "You just got SYSTEM on the internet-facing standalone in a three-host AD set.",
    terminalLabel: "ipconfig",
    terminal: `Ethernet adapter Ethernet0:
   IPv4 Address. . . . . . . . . . . : 192.168.120.10
Ethernet adapter Ethernet1:
   IPv4 Address. . . . . . . . . . . : 172.16.120.10`,
    question: "What should you do before pivoting into 172.16.120.0/24?",
    options: [
      "Immediately scan the internal network",
      "Grab proof.txt, screenshot it with ipconfig, and harvest credentials from the host",
      "Reboot the host to clear logs",
      "Start BloodHound collection from Kali",
    ],
    correctIndex: 1,
    explanation: "Exam reporting requires proof screenshots with the IP shown. Credentials cached on this host (LSASS, SAM, files) are usually the key to the internal network, so loot first.",
    rationale: [
      "Scanning without creds wastes time; loot first.",
      "Correct: proof plus credential harvesting.",
      "Rebooting may break your access and is never needed.",
      "BloodHound needs domain creds you haven't harvested yet.",
    ],
  },
  {
    id: "q-22", category: "Exam Chains", title: "Credential reuse",
    scenario: "You dumped a local admin NTLM hash on CLIENT02 and want to test it across the subnet.",
    terminalLabel: "nxc smb",
    terminal: `SMB  172.16.120.21  445  CLIENT02  [+] CLIENT02\\Administrator:(hash) (Pwn3d!)
SMB  172.16.120.22  445  CLIENT03  [+] CLIENT03\\Administrator:(hash) (Pwn3d!)
SMB  172.16.120.5   445  DC01      [-] CORP\\Administrator:(hash) STATUS_LOGON_FAILURE`,
    question: "What does this tell you?",
    options: [
      "The domain Administrator is compromised",
      "The local Administrator hash is reused on CLIENT03 (no LAPS); it doesn't work on the DC",
      "SMB signing blocked DC01",
      "You need to crack the hash before using it",
    ],
    correctIndex: 1,
    explanation: "(Pwn3d!) on CLIENT03 means the same local admin password is set there, a common finding without LAPS. The DC has no local SAM accounts in use, so the local hash fails there.",
    rationale: [
      "These are local accounts, not the domain Administrator.",
      "Correct: local admin reuse.",
      "Signing affects relay, not pass-the-hash authentication.",
      "NTLM hashes can be passed without cracking.",
    ],
  },
  {
    id: "q-23", category: "Linux PrivEsc", title: "PATH in crontab",
    scenario: "You read the system crontab.",
    terminalLabel: "cat /etc/crontab",
    terminal: `SHELL=/bin/sh
PATH=/home/dev/bin:/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

*/2 * * * * root cleanup.sh`,
    question: "Why is this exploitable as the dev user?",
    options: [
      "cleanup.sh is called without a full path, and /home/dev/bin (writable by dev) is first in PATH",
      "SHELL=/bin/sh is insecure",
      "Every-2-minutes cron jobs always run as the file owner",
      "It isn't exploitable without sudo",
    ],
    correctIndex: 0,
    explanation: "cron resolves cleanup.sh using the PATH defined here. /home/dev/bin is searched first and dev controls it, so a script of that name there would be run by root.",
    rationale: [
      "Correct: PATH hijack in cron.",
      "/bin/sh is a normal choice.",
      "The job runs as root (user field), not as the file owner.",
      "Cron runs as root independently of sudo.",
    ],
  },
  {
    id: "q-24", category: "Web Exploitation", title: "Serialized cookie",
    scenario: "You decode a session cookie from a Java app.",
    terminalLabel: "base64 -d | xxd",
    terminal: `$ echo 'rO0ABXNyABFjb20uYXBwLlVzZXJTZXNzaW9u...' | base64 -d | xxd | head -2
00000000: aced 0005 7372 0011 636f 6d2e 6170 702e  ....sr..com.app.
00000010: 5573 6572 5365 7373 696f 6e00 0000 0000  UserSession.....`,
    question: "What vulnerability class should you investigate?",
    options: [
      "JWT signature bypass",
      "Insecure Java deserialization",
      "SQL injection",
      "XXE",
    ],
    correctIndex: 1,
    explanation: "AC ED 00 05 is the Java serialization stream magic. If the server deserializes this cookie without integrity checks, a crafted object graph (gadget chain) can lead to code execution, depending on libraries on the classpath.",
    rationale: [
      "JWTs are three dot-separated base64url segments, not Java streams.",
      "Correct: Java serialization magic bytes.",
      "Nothing indicates a database query.",
      "XXE involves XML parsers; this is binary serialization.",
    ],
  },
  {
    id: "q-25", category: "Pivoting & Tunneling", title: "Proxychains scanning",
    scenario: "Your nmap SYN scan through proxychains returns every port as closed.",
    terminalLabel: "proxychains nmap",
    terminal: `$ proxychains nmap -sS -p 445,3389 172.16.20.15
[proxychains] config file found: /etc/proxychains4.conf
You requested a scan type which requires root privileges.
QUITTING!
$ sudo proxychains nmap -sS -p 445,3389 172.16.20.15
PORT     STATE  SERVICE
445/tcp  closed microsoft-ds
3389/tcp closed ms-wbt-server`,
    question: "What's wrong?",
    options: [
      "The host is down",
      "SOCKS only proxies full TCP connections; use -sT -Pn so nmap uses connect() through the proxy",
      "You need UDP scanning",
      "proxychains requires port 1080",
    ],
    correctIndex: 1,
    explanation: "SYN scans craft raw packets that bypass the SOCKS proxy entirely. proxychains only intercepts connect() calls, so use -sT (and -Pn, since ICMP won't traverse SOCKS).",
    rationale: [
      "Closed results here are an artefact of the scan type, not proof the host is down.",
      "Correct: connect scans through SOCKS.",
      "UDP doesn't traverse SOCKS4/most SOCKS5 setups either.",
      "Any port works if it's configured in proxychains4.conf.",
    ],
  },
  {
    id: "q-26", category: "Windows PrivEsc", title: "PowerShell history",
    scenario: "winPEAS points at a history file for the current user.",
    terminalLabel: "type ConsoleHost_history.txt",
    terminal: `cd C:\\inetpub\\wwwroot
Get-Service W3SVC
$pw = ConvertTo-SecureString 'Wint3r!2024' -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential('WEB01\\Administrator',$pw)
Enter-PSSession -ComputerName localhost -Credential $cred`,
    question: "What's the next step?",
    options: [
      "Use the recovered Administrator credentials (e.g. via WinRM or runas) and test them on other hosts",
      "Crack the SecureString first",
      "Ignore it; history files are cleared on reboot",
      "Start a Potato attack",
    ],
    correctIndex: 0,
    explanation: "The admin typed the password in plaintext. Use it for an admin session, and test it for reuse across the network (nxc) since admins often reuse local passwords.",
    rationale: [
      "Correct: plaintext admin creds.",
      "It was created from a plaintext string you can already read.",
      "PSReadLine history persists across sessions and reboots.",
      "No need for Potatoes when you have admin creds.",
    ],
  },
];

export const QUESTIONS_BY_ID: Record<string, ExamQuestion> = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
