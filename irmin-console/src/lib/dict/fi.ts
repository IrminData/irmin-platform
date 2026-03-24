/**
 * Finnish dictionary, key-value pairs for static strings in the application
 */
const fi = {
  // === CORE APPLICATION ===
  common: {
    // Basic actions
    loading: 'Ladataan...',
    cancel: 'Peruuta',
    confirm: 'Vahvista',
    save: 'Tallenna',
    delete: 'Poista',
    edit: 'Muokkaa',
    view: 'Näytä',
    create: 'Luo',
    update: 'Päivitä',
    add: 'Lisää',
    remove: 'Poista',
    download: 'Lataa',
    back: 'Takaisin',
    next: 'Seuraava',
    continue: 'Jatka',
    previous: 'Edellinen',
    saveChanges: 'Tallenna muutokset',
    close: 'Sulje',
    refresh: 'Päivitä',
    tryAgain: 'Yritä uudelleen',
    hideAdvancedOption: 'Piilota lisäasetukset',
    showAdvancedOptions: 'Näytä lisäasetukset',

    // Error display
    pageNotFoundDescription:
      'Sivua, jota etsitään, ei ole saatavilla tai on siirretty.',
    errorDetails: 'Virheen tiedot',
    reportIssue: 'Ilmoita virheestä',
    showDetails: 'Näytä lisätiedot',
    hideDetails: 'Piilota lisätiedot',
    copy: 'Kopioi',
    copied: 'Kopioitu',
    visual: 'Visuaalinen',
    stackTrace: 'Virheen seuranta',

    // Search and navigation
    search: 'Hae',
    filters: 'Suodattimet',
    noResults: 'Ei tuloksia',
    loadMore: 'Lataa lisää',
    more: 'Lisää',
    selectAll: 'Valitse kaikki',

    // Status and feedback
    success: 'Onnistui',
    successful: 'Onnistuneet',
    error: 'Virhe',
    failed: 'Epäonnistuneet',
    info: 'Info',
    optional: 'Valinnainen',
    all: 'Kaikki',

    // Pagination and filtering
    showing: 'Näytetään',
    of: '/',
    page: 'Sivu',
    clearFilters: 'Tyhjennä suodattimet',

    // Content
    name: 'Nimi',
    description: 'Kuvaus',
    email: 'Sähköposti',
    overview: 'Yleiskatsaus',
    actions: 'Toiminnot',
    logs: 'Lokit',
    timestamp: 'Aikaleima',
    lastModified: 'Viimeksi muokattu',
    size: 'Koko',
    color: 'Väri',
    owner: 'Omistaja',
    tags: 'Tagit',

    // Forms
    fieldRequired: 'Kenttä on pakollinen',
    fieldInvalid: 'Kenttä on virheellinen',
    resetForm: 'Tyhjennä lomake',
    pleaseFixErrors: 'Korjaa virheet yllä',

    // Messages and alerts
    insufficientPermissions: 'Liian vähän oikeuksia',
    ohNo: 'Voi ei!',
    pageNotFound: 'Sivua ei löytynyt',
    somethingWentWrong: 'Jotain meni pieleen',
    weEncounteredError: 'Kohtasimme virheen',
    tryAgainOrContactSupport: 'Yritä uudelleen tai ota yhteyttä tukeen',
    goBackHome: 'Mene takaisin kotisivulle',
    noOptionsMessage: 'Ei vaihtoehtoja',
    downloadSuccess: 'Lataus onnistui',
    dangerZone: 'Vaaravyöhyke',

    // Confirmations
    areYouSureYouWantToDelete:
      'Oletko varma, että haluat poistaa tämän kohteen?',
    areYouSureYouWantToTransferOwnership:
      'Oletko varma, että haluat vaihtaa tämän kohteen omistajan?',
    saved: 'Tallennettu onnistuneesti',
    deleted: 'Poistettu onnistuneesti',

    createFromTemplate: 'Luo mallista',
    templates: {
      title: 'Mallikirjasto',
      description: 'Valitse malli aloittaaksesi nopeasti',
      searchTemplates: 'Etsi malleja...',
      noTemplatesFound: 'Malleja ei löytynyt',
      noPlaceholders: 'Ei täytettäviä paikkamerkkejä tässä mallissa',
      selectTemplate: 'Valitse malli',
      fillPlaceholders: 'Täytä mallin paikkamerkit',
      example: 'Esimerkki',
      preview: 'Esikatselu',
      createNew: 'Luo uusi',
      replaceCurrent: 'Korvaa nykyinen',
    },

    // Contact and support
    contactUs: 'Ota yhteyttä',
    readMore: 'Lue lisää',

    // Language and localization
    selectLanguage: 'Valitse kieli',
  },

  // === USER INTERFACE ===
  theme: {
    toggle: 'Vaihda teemaa',
    light: 'Vaalea',
    dark: 'Tumma',
    system: 'Järjestelmä',
  },

  search: {
    advancedSearch: 'Edistynyt haku',
    searchDescription:
      'Hae data-arkistoista, prosesseista, yhteyksistä ja muusta',
    searchPlaceholder: 'Hae mitä tahansa...',
    contentTypes: 'Sisältötyypit',
    fromDate: 'Alkaen',
    toDate: 'Päättyen',
    resultsPerPage: 'Tuloksia per sivu',
    noResultsFound: 'Ei tuloksia',
    tryAdjustingFilters: 'Kokeile muuttaa hakutermejä tai suodattimia',
    startSearching: 'Aloita hakeminen',
    startSearchingDescription:
      'Syötä hakutermi yllä löytääksesi data-arkistoja, prosesseja, yhteyksiä ja muuta',
    searchingText: 'Haetaan...',
    resultsFoundFor: 'tulosta löytyi haulle',
    resultFoundFor: 'tulos löytyi haulle',
  },

  // === NAVIGATION ===
  consoleNavigation: {
    searchPlaceholder: 'Etsi tietoja ja muuta',
    irmin: 'Irmin',
    irminConsole: 'Irmin-konsoli',
    irminWebsite: 'Irmin-verkkosivu',
    workspace: 'Työtila',
    workspaces: 'Työtilat',
    settings: 'Asetukset',
    usefulLinks: 'Hyödylliset linkit',
    scripts: 'Skriptit',
    queries: 'Kyselyt',
    aiApplications: 'AI-sovellukset',
    workspaceSettings: 'Työtila',
    goToWebsite: 'Siirry verkkosivustolle',
    myProfile: 'Profiilini',
    signOut: 'Kirjaudu ulos',
    guides: 'Oppaat',
    contactSupport: 'Ota yhteyttä tukeen',
    developerDocs: 'Dokumentaatio kehittäjille',

    staticSearchItems: {
      guides: 'Irmin Oppaat',
      documentation: 'Irmin Dokumentaatio',
      termsAndPrivacy: 'Käyttöehdot & Tietosuojakäytäntö',
      createWorkspace: 'Luo uusi työtila',
      workspaceDocumentation: 'Työtilan Dokumentaatio',
      myProfile: 'Oma Profiili',
      manageWorkspaces: 'Hallitse Työtiloja',
      workspaceSettings: 'Työtilan asetukset',
      createWorkflow: 'Luo uusi prosessi',
      createConnection: 'Luo uusi yhteys',
      createRepository: 'Luo uusi data-arkisto',

      description: {
        irminWebsite: 'Siirry Irmin verkkosivustolle',
        contactUs: 'Ota yhteyttä tiimiimme',
        guides: 'Lue Irmin oppaat',
        documentation: 'Lue Irmin dokumentaatio',
        termsAndPrivacy: 'Lue käyttöehdot ja tietosuojakäytäntö',
        createWorkspace: 'Luo uusi Irmin työtila ja aloita työskentely',
        logs: 'Näytä nykyisen työtilan lokit',
        workspaceDocumentation: 'Näytä työtilan dokumentaatio',
        myProfile: 'Näytä ja muokkaa profiiliasi',
        manageWorkspaces: 'Hallitse työtilojasi',
        scripts: 'Kirjoita ja suorita skriptejä',
        workspaceSettings: 'Muokkaa työtilan asetuksia',
        workflows: 'Näytä ja hallitse prosesseja',
        actions: 'Näytä ja hallitse toimintoja',
        imports: 'Näytä ja hallitse tuonteja',
        exports: 'Näytä ja hallitse vientejä',
        pipelines: 'Näytä ja hallitse dataputkia',
        createWorkflow: 'Luo uusi minkä tahansa tyyppinen prosessi',
        connections: 'Näytä ja hallitse yhteyksiä',
        createConnection: 'Luo uusi yhteys käytettäväksi prosesseissa',
        repositories: 'Näytä ja hallitse data-arkistoja',
        createRepository: 'Luo uusi data-arkisto tietojen tallentamista varten',
        createAIApplication:
          'Luo uusi AI-sovellus jakaaksesi dataa tekoälytyökalujen kanssa',
      },
    },
  },

  // === AI APPLICATIONS ===
  aiApplication: {
    aiApplication: 'AI-sovellus',
    createAIApplication: 'Luo AI-sovellus',
    dataSources: 'tietolähdettä',
    dataSource: 'tietolähde',
    toolsEnabled: 'työkalua käytössä',
    toolEnabled: 'työkalu käytössä',
    dataSourcesDescription:
      'Määritä mihin tietovarastoihin ja polkuihin tällä AI-sovelluksella on pääsy. Tietolähteet määrittävät mitä dataa yhdistetyt LLM-agentit voivat käyttää.',
    noDataSourcesConfigured:
      'Ei määritettyjä tietolähteitä. Lisää tietolähde, jotta AI-sovellus voi käyttää työtilan dataa.',
    dataSourcePathHint:
      'Jätä tyhjäksi tai käytä "/" sisällyttääksesi koko tietovaraston',
    deleteAIApplication: 'Poista AI-sovellus',
    deleteWarning:
      'AI-sovelluksen poistaminen mitätöi kaikki API-avaimet ja poistaa pääsyn kaikilta yhdistettyjiltä LLM-agenteilta. Tätä toimintoa ei voi kumota.',
    // Overview section
    apiKey: 'API-avain',
    apiKeyDescription:
      'Käytä tätä API-avainta todentaaksesi pyynnöt AI-sovelluksen API:in ja MCP-palvelimeen.',
    apiKeyOnlyShownOnce:
      'API-avain näytetään vain kerran kun AI-sovellus luodaan. Ota yhteyttä omistajaan, jos tarvitset pääsyn.',
    mcpEndpoint: 'MCP-päätepiste',
    restApiEndpoint: 'REST API -päätepiste',
    enabledTools: 'Käytössä olevat työkalut',
    // Tools
    toolQueryName: 'SQL-kysely',
    toolQueryDescription: 'Suorita SQL-kyselyjä työtilan dataan',
    toolSchemaName: 'Skeema',
    toolSchemaDescription: 'Hae dataskeema tietovaraston objekteille',
    toolListObjectsName: 'Listaa objektit',
    toolListObjectsDescription: 'Listaa tiedostot ja kansiot tietovarastoissa',
    toolGetContentName: 'Hae sisältö',
    toolGetContentDescription: 'Lue tekstitiedostojen sisältö',
    toolVectorSearchName: 'Vektorihaku',
    toolVectorSearchDescription: 'Semanttinen haku upotuksissa',
    toolDocsName: 'Dokumentaatio',
    toolDocsDescription: 'Käytä AI-sovelluksen dokumentaatiota',
    // Write Tools
    toolWriteName: 'Kirjoitusoperaatiot',
    toolWriteDescription: 'Salli agenttien muokata dataa tietovarastoissa',
    writeConfigTitle: 'Kirjoitusasetukset',
    writeFileUpload: 'Tiedoston lataus',
    writeFileUpdate: 'Tiedoston päivitys',
    writePatch: 'JSON Patch -operaatiot',
    writeAutoCommit: 'Automaattinen tallentaminen',
    writeRequireCommitMessage: 'Vaadi tallennusviesti',
    writeCommitMessagePrefix: 'Tallennusviestin etuliite',
    writeRequireApproval: 'Vaadi ihmisen hyväksyntä',
    // Pending Writes
    pendingWritesTitle: 'Odottavat kirjoitukset',
    pendingWritesDescription:
      'Tarkista ja hyväksy AI-agenttien kirjoitusoperaatiot',
    pendingWritesError: 'Odottavien kirjoitusten lataaminen epäonnistui',
    noPendingWrites: 'Ei odottavia kirjoituksia tarkistettavaksi',
    howToConnect: 'Kuinka yhdistää',
    howToConnectMcpPrefix: 'Käytä ',
    howToConnectMcpBold: 'MCP-päätepistettä',
    howToConnectMcpSuffix:
      ' yhdistääksesi Cursorin, Claude Desktopin tai muiden MCP-asiakkaiden kanssa.',
    howToConnectApiKeyPrefix: 'Sisällytä ',
    howToConnectApiKeyBold: 'API-avain',
    howToConnectApiKeySuffix: ' Bearer-tunnisteena Authorization-otsikkoon.',
    howToConnectTools:
      'Ota käyttöön tiettyjä työkaluja alta paljastaaksesi ominaisuuksia AI-agentillesi.',
    apiReference: 'API-viite',
    toolsControlDescription:
      'Hallitse, mitkä ominaisuudet paljastetaan MCP-palvelimen kautta.',
    hideApiKey: 'Piilota API-avain',
    showApiKey: 'Näytä API-avain',
    copyApiKey: 'Kopioi API-avain',
    // Custom Tools
    customTools: 'Mukautetut työkalut',
    customToolsDescription:
      'Määritä mukautettuja työkaluja, joita tekoäly voi käyttää tiettyjen kyselyiden, prosessien tai hakujen suorittamiseen.',
    noCustomTools:
      'Mukautettuja työkaluja ei ole vielä määritelty. Lisää mukautettu työkalu laajentaaksesi tekoälyn ominaisuuksia.',
    addCustomTool: 'Lisää mukautettu työkalu',
    editCustomTool: 'Muokkaa mukautettua työkalua',
    customToolDialogDescription:
      'Määritä mukautettu työkalu, jota tekoäly voi käyttää.',
    toolName: 'Työkalun nimi',
    toolNameHint:
      'Vain pieniä kirjaimia, numeroita ja alaviivoja. Täytyy alkaa kirjaimella.',
    toolDescriptionHint:
      'Tämä kuvaus auttaa tekoälyä ymmärtämään, milloin tätä työkalua kannattaa käyttää.',
    toolType: 'Tyyppi',
    storedQuery: 'Tallennettu kysely',
    selectQuery: 'Valitse kysely',
    workflow: 'Prosessi',
    selectWorkflow: 'Valitse prosessi',
    embeddingPath: 'Upotuksen polku',
    embeddingPathHint: 'Yhtenäinen polku upotetiedostoon.',
    topK: 'Top K tulosta',
    embeddingFilter: 'Metadatan suodatin',
    embeddingFilterHint:
      'Suodata tuloksia metadatan perusteella. Yksi avain=arvo -pari per rivi.',
    // Activity / Tool Logs
    activity: 'Aktiviteetti',
    activityDescription:
      'Näytä kaikki tämän AI-sovelluksen kautta tehdyt työkalukutsut, mukaan lukien syötteet, suoritusaika ja tila.',
    noActivityYet: 'Ei vielä aktiviteettia',
    noActivityDescription:
      'AI-sovelluksen kautta tehdyt työkalukutsut näkyvät täällä.',
    toolCalls: 'Työkalukutsut',
    avgDuration: 'Keskim. kesto',
    noInputs: 'Ei syötteitä',
  },

  // === WORKSPACE ===
  workspace: {
    general: 'Yleiset',
    users: 'Käyttäjät',
    policies: 'Oikeudet',
    invites: 'Kutsut',
    tags: 'Tunnisteet',
    billing: 'Laskutus',
    deletionWarning:
      'Oletko varma, että haluat poistaa tämän työtilan? Tätä toimintoa ei voi peruuttaa ja se poistaa kaiken tähän työtilaan liittyvän datan.',
    workspaceName: 'Työtilan nimi',
    workspaceDescription: 'Työtilan kuvaus',
    deletionNote:
      'Työtilan poistaminen poistaa kaiken siihen liittyvän datan. Tätä toimintoa ei voi peruuttaa.',
    deleteWorkspace: 'Poista työtila',
    billingCurrentPlan: 'Nykyinen tilaus',
    billingManageBilling: 'Hallitse laskutusta',
    billingAddPaymentMethod: 'Lisää maksutapa',
    billingFreeUser: 'Ilmainen — käyttörajoitukset voimassa',
    billingSubscribed: 'Tilattu — rajoittamaton käyttö',
    billingCancelled:
      'Peruutettu — käyttörajoitukset voimaan jakson päättyessä',
    billingPastDue: 'Maksuongelma — päivitä maksutapasi',
    billingStatusActive: 'Aktiivinen',
    billingStatusCancelled: 'Peruutettu',
    billingStatusPastDue: 'Erääntynyt',
    billingStatusTrialing: 'Kokeilujakso',
    billingStatusNone: 'Ei tilausta',
    billingDimensionStorage: 'Tallennustila',
    billingDimensionWorkflowRuns: 'Työnkulkuajot',
    billingDimensionAiRequests: 'AI-pyynnöt',
    billingDimensionApiRequests: 'API-pyynnöt',
    billingDimensionDataTransfer: 'Tiedonsiirto',
    billingDimensionSeats: 'Käyttäjäpaikat',
    billingDimensionComputeInvocations: 'Laskentakutsut',
    billingDimensionVectorizations: 'Vektorisaatiot',
    billingRenewsOn: 'Uusiutuu',
    billingAccessUntil: 'Käyttöoikeus asti',
    billingCheckoutSuccess: 'Maksu onnistui',
    billingCheckoutSuccessNote:
      'Tilaustasi käsitellään. Tämä voi kestää hetken.',
    billingCheckoutSuccessTimeout:
      'Käsittely kestää odotettua kauemmin. Tarkista laskutusasetuksesi hetken kuluttua.',
    billingCheckoutSuccessError:
      'Tilauksen vahvistamisessa tapahtui virhe. Tarkista laskutusasetuksesi.',
    billingCheckoutSuccessPaymentIssue:
      'Maksua ei voitu käsitellä. Tarkista maksutapasi ja yritä uudelleen.',
    billingCheckoutError: 'Maksuprosessia ei voitu aloittaa. Yritä uudelleen.',
    billingPortalError: 'Laskutusportaalia ei voitu avata. Yritä uudelleen.',
    // Usage credit
    billingIncludedCredit: 'Ilmainen krediitti',
    billingIncluded: 'sisältyy',
    billingOverage: 'Ylitys',
    billingCreditPerMeter: 'Krediitti per mittari',
    billingBannerTitle: 'Ilmaisversio',
    billingBannerDescription:
      'Lisää maksutapa avataksesi rajoittamattoman käytön',
    billingBannerAction: 'Määritä laskutus',
    billingLimitsResetIn: 'Rajat nollautuvat {n} päivän kuluttua',
    billingInfo: 'Laskutustiedot',
    billingInfoDescription:
      'Yritystiedot, jotka näkyvät laskuilla. Muutokset näkyvät tulevissa laskuissa.',
    billingCompanyName: 'Yrityksen nimi',
    billingTaxID: 'ALV-tunnus',
    billingAddressLine1: 'Osoiterivi 1',
    billingAddressLine2: 'Osoiterivi 2',
    billingCity: 'Kaupunki',
    billingState: 'Osavaltio / Alue',
    billingPostalCode: 'Postinumero',
    billingCountry: 'Maakoodi',
    billingAddress: 'Laskutusosoite',
    billingInfoSaved: 'Laskutustiedot tallennettu onnistuneesti',
    apiMcp: 'API/MCP',
    api: {
      settings: 'API/MCP-asetukset',
      restApi: 'REST API',
      mcp: 'MCP',
      apiBaseUrl: 'API-pohjaosoite',
      mcpUrl: 'MCP-palvelimen osoite',
      apiDescription:
        'Käytä REST API:a ohjelmallisesti työtilasi tietojen, säilöjen, työnkulkujen ja muiden resurssien hallintaan.',
      mcpDescription:
        'Käytä Model Context Protocol (MCP) -palvelinta integroidaksesi Irminin tekoälyavustajiin ja kehitystyökaluihin, kuten Claude Desktopiin.',
      getApiToken: 'Hae API-avain',
      getMcpToken: 'Hae MCP-avain',
      viewApiDocs: 'Näytä API-dokumentaatio',
      apiUsageNote:
        'API:n käyttämiseen tarvitset API-avaimen. Luo sellainen profiilisi asetuksista.',
      apiExampleTitle: 'Esimerkki API-pyyntö',
      apiExampleDescription: 'Tee pyyntö API:in curl-komennolla:',
      apiExampleCurl:
        'curl -X GET "<API_URL>/api/v1/workspaces" \\\n  -H "Authorization: Bearer <api-avain>" \\\n  -H "Content-Type: application/json"',
      apiExampleNote:
        'Korvaa <api-avain> yllä olevalla API-avaimella avainten sivulta.',
      mcpUsageNote:
        'MCP-palvelimen käyttämiseen tarvitset API-avaimen. Luo sellainen profiilisi asetuksista.',
      mcpAuthHeader: 'Authorization: Bearer <api-avain>',
      mcpAuthHeaderLabel: 'Todennusotsake',
      mcpClaudeDesktopTitle: 'Lisää Claude Desktopiin',
      mcpClaudeDesktopDescription:
        'Lisää tämä konfiguraatio Claude Desktop -konfiguraatiotiedostoosi:',
      mcpStreamableHttpTab: 'Streamable HTTP',
      mcpRemoteTab: 'mcp-remote',
      mcpStreamableHttpConfig:
        '{\n  "mcpServers": {\n    "irmin": {\n      "url": "<MCP_URL>",\n      "headers": {\n        "Authorization": "Bearer <api-avain>"\n      }\n    }\n  }\n}',
      mcpRemoteConfig:
        '{\n  "mcpServers": {\n    "irmin": {\n      "command": "npx",\n      "args": [\n        "-y",\n        "mcp-remote@latest",\n        "<MCP_URL>",\n        "--header",\n        "Authorization: Bearer ${AUTH_TOKEN}"\n      ],\n      "env": {\n        "AUTH_TOKEN": "<api-avain>"\n      }\n    }\n  }\n}',
      mcpConfigNote:
        'Korvaa <MCP_URL> yllä olevalla MCP-palvelimen osoitteella ja <api-avain> API-avaimella avainten sivulta.',
      viewMcpDocs: 'Näytä MCP-dokumentaatio',
    },
    addTags: 'Lisää tunnisteet',
    failedToLoadTags: 'Tunnisteiden lataaminen epäonnistui',
    failedToLoadWorkspaces: 'Työtilojen lataaminen epäonnistui',
    recentlyUsed: 'Viimeksi käytetty',
  },

  workspaceSwitcher: {
    selectWorkspace: 'Valitse työtila',
    createNewWorkspace: 'Luo uusi työtila',
    createNewWorkspaceDescription:
      'Luo uusi työtila datasi, työnkulkujesi ja tiimityöskentelyn organisointiin.',
    createFirstWorkspace: 'Luo ensimmäinen työtilasi',
    createFirstWorkspaceDescription:
      'Työtilat auttavat organisoimaan datasi, työnkulkusi ja tiimityöskentelyn. Aloita luomalla ensimmäinen työtilasi.',
    workspace: 'Työtila',
    leaveWorkspace: 'Poistu työtilasta',
    leaveWorkspaceConfirm:
      'Oletko varma, että haluat poistua tästä työtilasta?',
  },

  // === DATA MANAGEMENT ===
  repository: {
    repository: 'Data-arkisto',
    repositories: 'Data-arkistot',
    sqlQuery: 'SQL-kysely',
    runQuery: 'Aja kysely',
    createNewRepository: 'Luo uusi data-arkisto',
    immutableWarning: 'Muuttumaton data-arkisto tai haara',
    immutableWarningDescription:
      'Tämä data-arkisto tai valittu haara on muuttumaton, eikä sitä voi muokata.',
    shareZipLink: 'Jaa zip-tiedostona',
    shareZipLinkCopied: 'Zip-linkki kopioitu leikepöydälle',
    shareZipError: 'Zip-jakolinkin luominen epäonnistui',
    branches: {
      branches: 'Haarat',
      currentBranch: 'Nykyinen',
      branch: 'Haara',
      selectBranch: 'Valitse haara',
      ref: 'Ref',
      createBranch: 'Luo haara',
      primary: 'Päähaara',
      primaryBranch: 'Päähaara',
      newBranchName: 'Uuden haaran nimi',
      fromBranch: 'Haarasta',
      confirmDeleteBranch: 'Oletko varma, että haluat poistaa tämän haaran?',
    },
    tags: {
      tags: 'Tagit',
      createTag: 'Luo tagi',
      newTagName: 'Uuden tagin nimi',
      fromCommit: 'Commitista',
      confirmDeleteTag: 'Oletko varma, että haluat poistaa tämän tagin?',
      currentlyViewing: 'Nykyinen näkymä',
    },
    commit: {
      commits: 'Commitit',
      commitHash: 'Commit hash',
      copyHash: 'Kopioi hash',
      commitHashCopied: 'Commit hash kopioitu leikepöydälle',
      uncommittedChanges: 'Tallentamattomat muutokset',
      showingUncommittedChangesFor:
        'Näytetään tallentamattomat muutokset haaralle',
      commitChanges: 'Tallenna muutokset',
      revertChanges: 'Peru muutokset',
      confirmRevertChanges:
        'Oletko varma, että haluat peruuttaa kaikki tallentamattomat muutokset?',
      noUncommittedChanges: 'Ei tallentamattomia muutoksia',
      noUncommittedChangesDescription:
        'Jotta voit verrata muutoksia, sinun on tehtävä tallentamattomia muutoksia nykyiseen haaraan',
      commitNewChangesTo: 'Tallenna uudet muutokset haaralle',
      commitMessage: 'Commit-viesti',
      commitMessagePlaceholder: 'Kuvaile muutokset',
      changes: 'Muutokset',
      resetBranch: 'Palauta haara tähän committiin',
      confirmResetBranch: 'Palauta haara committiin?',
      resetBranchDescription:
        'Tämä siirtää nykyisen haaran osoittimen tähän committiin. Tämän jälkeiset commitit eivät enää ole tässä haarassa. Tätä toimintoa ei voi peruuttaa.',
      revertCommit: 'Peruuta tämä commit',
      confirmRevertCommit: 'Peruuta tämä commit?',
      revertCommitDescription:
        'Tämä luo uuden commitin, joka kumoaa tämän commitin muutokset. Alkuperäinen commit säilyy historiassa. Tämä on turvallinen, ei-tuhoisa toiminto.',
    },
    compare: {
      compare: 'Vertaa',
      switchDirection: 'Vaihda suuntaa',
      baseBranch: 'Pohjaviittaus',
      compareBranch: 'Vertailuviittaus',
      customRef: 'Mukautettu viittaus',
      enterCustomRef: 'Syötä tagin nimi tai commit hash',
      customRefPlaceholder: 'esim. v1.0.0 tai abc123...',
      merge: 'Sulauta',
      into: 'haaraan',
      comparing: 'Verrataan',
      and: 'ja',
      bytes: 'tavua',
      modified: 'muokattu',
      moved: 'siirretty',
      conflict: 'konflikti',
      hideChanges: 'Piilota muutokset',
      fetchChanges: 'Hae muutokset',
      thereIsNothingToCompare: 'Ei mitään vertailtavaa tai yhdistettävää',
      thereIsNothingToCompareSubtitle:
        'Tarvitset kaksi eri lähdettä saadaksesi pätevän vertailun.',
      baseContent: 'Pohjasisältö',
      comparedContent: 'Vertailusisältö',
      mergeStrategy: 'Sulautusstrategia',
      squashCommits: 'Yhdistä commitit',
      mergeCommitDescription: 'Sulautuscommitin kuvaus',
      failedToLoadDiff: 'Vertailun lataaminen epäonnistui',
      failedToLoadDiffSubtitle:
        'Valittuja viittauksia ei voitu vertailla. Tarkista, että molemmat viittaukset ovat olemassa ja yritä uudelleen.',
      defaultStrategy: 'Oletus',
      destWinsStrategy: 'Kohde voittaa',
      sourceWinsStrategy: 'Lähde voittaa',
      mergeExplanation:
        'Jos sulauttamisessa esiintyy konflikti, tämä asetus suosii automaattisesti pohjan ("Kohde voittaa") tai vertailun ("Lähde voittaa") muutoksia. Ellei mitään valintaa tehdä, sulautus epäonnistuu konfliktitilanteessa.',
      schemaChanges: 'Skeemamuutokset',
      breakingChanges: 'Rikkovat muutokset',
      nonBreakingChanges: 'Ei-rikkovat muutokset',
      file: 'tiedosto',
      files: 'tiedostoa',
    },
    objects: {
      object: 'Objekti',
      objects: 'Objektit',
      noObjects: 'Ei objekteja',
      noObjectsMessage:
        'Aloita lataamalla tiedostoja tai luomalla tuontiprosessin',
      uploadObject: 'Lataa objekti',
      uploadFiles: {
        title: 'Lataa tiedostoja',
        dropZone: 'Pudota tiedostot tähän tai napsauta valitaksesi',
        browseFiles: 'Selaa tiedostoja',
        addMore: 'Lisää tiedostoja',
        uploadingTo: 'Ladataan kohteeseen:',
        startUpload: 'Lataa {count} tiedostoa',
        done: 'Valmis',
        conflict: {
          title: 'Tiedosto on jo olemassa',
          message: '"{filename}" on jo olemassa tässä sijainnissa.',
          replace: 'Korvaa',
          skip: 'Ohita',
          replaceAll: 'Korvaa kaikki',
          skipAll: 'Ohita kaikki',
        },
        status: {
          pending: 'Odottaa',
          checking: 'Tarkistetaan...',
          uploading: 'Ladataan...',
          completed: 'Ladattu',
          failed: 'Epäonnistui',
          skipped: 'Ohitettu',
          conflict: 'Ristiriita',
        },
        summary: {
          uploaded: '{count} ladattu',
          skipped: '{count} ohitettu',
          failed: '{count} epäonnistui',
        },
      },
      path: 'Polku',
      currentPath: 'Nykyinen polku',
      currentName: 'Nykyinen nimi',
      type: 'Tyyppi',
      contentType: 'Sisältötyyppi',
      view: 'Näytä',
      unsupportedContentType: 'Sisältötyyppiä ei tueta',
      contentUnavailable: 'Objektin sisältö ei ole saatavilla',
      viewRendered: 'Renderöity',
      viewSource: 'Lähdekoodi',
      contentTooLarge:
        'Tiedosto on liian suuri näytettäväksi. Lataa se sen sijaan.',
      viewSchema: 'Näytä rakenne',
      filterObjects: 'Suodata objekteja',
      uploadAndReplace: 'Lataa ja korvaa',
      moveOrRename: 'Siirrä tai nimeä uudelleen',
      changeHistory: 'Muutoshistoria',
      shareLink: 'Jaa linkki',
      shareLinkCopied: 'Linkki kopioitu leikepöydälle',
      shareError: 'Jakolinkin luominen epäonnistui',
      shareLinkExpiryLabel: 'Linkki vanhenee',
      shareLinkGenerate: 'Kopioi linkki',
      shareLinkCustomHours: 'Tuntia',
      shareLinkExpiryOptions: {
        '1': '1 tunti',
        '24': '24 tuntia',
        '72': '3 päivää',
        '168': '7 päivää',
        custom: 'Mukautettu',
        never: 'Ei vanhene',
      },
      targetRepository: 'Kohde data-arkisto',
      targetBranch: 'Kohde haara',
      objectName: 'Objektin nimi',
      fileToUpload: 'Ladattava tiedosto',
      pathInRepository: 'Polku data-arkistossa',
      noFilesSelected: 'Valitse tiedostot ennen lataamista',
      binary: 'Binääri',
      group: 'Ryhmä',
      structured: 'Strukturoitu',
      children: 'Lapset',
      hideChildren: 'Piilota lapset',
      showChildren: 'Näytä lapset',
      unknownType: 'Tuntematon tyyppi',
      hideSchema: 'Piilota rakenne',
      showSchema: 'Näytä rakenne',
      enterPath: 'Syötä data-arkiston polku (esim. polku/tiedostoon.json)',
      newObjectWillBeCreated: 'Uusi objekti luodaan',
      validate: 'Validoi',
      validateObject: 'Validoi objekti',
      validateObjectDescription: 'Validoi tämä objekti skeemaa vasten',
      validationMode: 'Validointitila',
      validationModeStrict: 'Tiukka (epäonnistuu virheestä)',
      validationModePermissive: 'Salliva (kirjaa virheet mutta jatkaa)',
      validationSchemaJson: 'Validointiskeema (JSON)',
      validationPassed: 'Validointi onnistui',
      validationFailed: 'Validointi epäonnistui',
      validationLogs: 'Validointilokit',
      validationSuccessMessage: 'Objektin validointi onnistui',
      validationFailedMessage: 'Objektin validointi epäonnistui',
      validationErrorMessage: 'Objektin validointi epäonnistui',
      invalidJsonSchema: 'Virheellinen JSON-skeema tai validointivirhe',
      vectors: 'Vektorit',
      vectorize: 'Vektorisoi',
      vectorizeSuccess: 'Upotukset luotu onnistuneesti',
      vectorizeError: 'Upotusten luonti epäonnistui',
      vectorizeSourcePaths: 'Lähdetiedostot',
      vectorizeSourcePathsDescription: 'Polut vektorisoitaviin tiedostoihin',
      vectorizeSourcePathPlaceholder: 'esim. data/dokumentit/doc.txt',
      vectorizeAddSourcePath: 'Lisää lähdepolku',
      vectorizeOutputPath: 'Tulostuspolku',
      vectorizeOutputPathDescription:
        'Polku mihin upotustiedosto tallennetaan (pitää päättyä .parquet)',
      vectorizeOutputPathPlaceholder: 'esim. upotukset/dokumentit.parquet',
      embeddingFile: 'Upotustiedosto',
      embeddingsModel: 'Malli',
      embeddingsDimensions: 'Dimensiot',
      embeddingsChunkSize: 'Palan koko',
      embeddingsOverlap: 'Päällekkäisyys',
      embeddingsChunkCount: 'Palat',
      embeddingsSourceFiles: 'Lähdetiedostot',
      embeddingsTopK: 'Tulokset',
      searchVectors: 'Hae vektoreja',
      searchVectorsPlaceholder: 'Kirjoita hakukysely...',
      searchVectorsError: 'Upotusten haku epäonnistui',
      searchResults: 'Hakutulokset',
      noSearchResults: 'Tuloksia ei löytynyt',
      embeddingsScore: 'Pisteet',
      embeddingsContent: 'Sisältö',
      embeddingsSourceFile: 'Lähde',
      embeddingsChunk: 'Pala',
      embeddingsPriority: 'Prioriteetti',
      embeddingsPriorityDescription:
        'Korkeamman prioriteetin upotukset suositaan RAG-haussa (0.0-1.0)',
      embeddingsConfigLoaded: 'Käytetään olemassa olevan tiedoston asetuksia',
      embeddingsConfigLoadedDescription:
        'Asetukset ladattiin olemassa olevasta upotustiedostosta yhteensopivuuden varmistamiseksi.',
      embeddingsMetadata: 'Metatiedot',
      embeddingsMetadataKey: 'Avain',
      embeddingsMetadataValue: 'Arvo',
      embeddingsMetadataAddField: 'Lisää kenttä',
      embeddingsMetadataRemoveField: 'Poista',
      embeddingsMetadataImportJson: 'Tuo JSON',
      embeddingsMetadataExportJson: 'Vie JSON',
      embeddingsContentHash: 'Sisällön tiiviste',
      embeddingsUpsert: 'Päivitä upotukset',
      embeddingsUpsertInserted: 'Lisätty',
      embeddingsUpsertSkipped: 'Ohitettu (on jo olemassa)',
      embeddingsUpsertUpdated: 'Päivitetty',
      embeddingsWizardTitle: 'Luo upotukset',
      embeddingsWizardSelectSource: 'Valitse lähde',
      embeddingsWizardConfigureChunking: 'Määritä paloittelu',
      embeddingsWizardAddMetadata: 'Lisää metatiedot',
      embeddingsWizardGenerate: 'Luo upotukset',
      embeddingsWizardPreviewChunks: 'Esikatsele paloja',
      embeddingsWizardGenerating: 'Luodaan upotuksia...',
      embeddingsEditTitle: 'Muokkaa upotusta',
      embeddingsEditDescription:
        'Päivitä tämän upotusosan metatiedot ja prioriteetti',
      embeddingsEditSave: 'Tallenna muutokset',
      embeddingsEditSaving: 'Tallennetaan...',
      pointer: 'Osoitin',
      pointsTo: 'Osoittaa kohteeseen',
      createPointer: 'Luo osoitin',
      createPointerDescription:
        'Luo osoitin viittaamaan toisessa data-arkistossa olevaan objektiin',
      targetBranchRef: 'Kohdehaara/viite',
      targetObject: 'Kohdeobjekti',
      pointerName: 'Osoittimen nimi',
      pointerWillBeSavedAs: 'Tallennetaan nimellä',
      pleaseSelectTargetRepository: 'Valitse kohde data-arkisto',
      pleaseSelectTargetObject: 'Valitse kohdeobjekti',
      pleaseEnterPointerName: 'Anna osoittimelle nimi',
      pleaseEnterTargetRef: 'Anna kohdeviite',
      couldNotCreatePointer: 'Osoitinta ei voitu luoda',
      selectRepository: 'Valitse data-arkisto',
    },
    settings: {
      deletionNote:
        'Data-arkiston poistaminen poistaa kaiken siihen liittyvän datan. Tätä toimintoa ei voi peruuttaa.',
      deleteRepository: 'Poista data-arkisto',
    },
    schema: {
      schema: 'Rakenne',
      noSchema: 'Ei rakennetta saatavilla',
    },
  },
  connections: {
    connection: 'Yhteys',
    connections: 'Yhteydet',
    testConnection: 'Testaa yhteys',
    settings: {
      saveChanges: 'Tallenna muutokset',
      deletionNote:
        'Poistamalla tämän yhteyden poistetaan kaikki siihen liittyvä data. Tätä toimintoa ei voi peruuttaa.',
      delete: 'Poista yhteys',
    },
    create: {
      selectConnector: 'Valitse yhdistin',
      establishConnection: 'Perusta yhteys',
      configureSettings: 'Määritä asetukset',
      configureConnection: 'Määritä yhteys',
      createNewConnection: 'Luo uusi yhteys',
      confirmConnectorSelection: 'Vahvista yhdistimen valinta ja jatka',
      selectedConnector: 'Valittu yhdistin',
      connectionName: 'Yhteyden nimi',
      connectionNamePlaceholder: 'esim. oma Google Analytics -yhteys',
      connectionDescription: 'Yhteyden kuvaus',
      connectionDescriptionPlaceholder:
        'Kirjoita kuvaus yhteydelle, jotta muut tietävät, mihin sitä käytetään',
      addCustomConnector: 'Lisää oma yhdistin',
      continueAndTest: 'Jatka ja testaa yhteys',
      createConnection: 'Luo yhteys',
      goBack: 'Mene takaisin',
      success: 'Yhteys onnistui',
      failed: 'Yhteys epäonnistui',
      configuration_valid: 'Yhteyden konfiguraatio on validi',
      configuration_invalid: 'Yhteyden konfiguraatio on virheellinen',
      contactSupport: 'Ota yhteyttä tukeen',
    },

    config: {
      details: 'Yhteyden tiedot',
      settings: 'Yhteyden asetukset',
      cannotCopySecret: 'Ei voi kopioida salattua arvoa',
      editConfiguration: 'Muokkaa konfiguraatiota',
      editConfigurationAction: 'Muokkaa konfiguraatiota',
      editDescription:
        'Päivitä yhteyden tunnistetiedot ja asetukset ennen tallennusta.',
      updateConfiguration: 'Päivitä konfiguraatio',
      updateFailed: 'Yhteyden päivitys epäonnistui. Tarkista virheet.',
    },

    schemaValidation: {
      title: 'Skeeman validointi',
      viewTab: 'Näytä skeema',
      validateTab: 'Validoi',
      mode: 'Tila',
      validateMode: 'Validoi data',
      diffMode: 'Vertaa skeemoja',
      operationMethod: 'Operaatiomenetelmä',
      uploadFile: 'Lataa JSON-tiedosto',
      selectFile: 'Valitse tiedosto...',
      validateButton: 'Validoi',
      compareButton: 'Vertaa',
      validationPassed: 'Validointi onnistui',
      validationFailed: 'Validointi epäonnistui',
      errors: 'virhe(ttä)',
      errorsTitle: 'Virheet',
      warningsTitle: 'Varoitukset',
      schemasCompatible: 'Skeemat yhteensopivia',
      schemasIncompatible: 'Rikkovia muutoksia havaittu',
      breakingChanges: 'Rikkovat muutokset',
      nonBreakingChanges: 'Ei-rikkovat muutokset',
    },
  },

  // === TILAUKSET ===
  subscriptions: {
    title: 'Tilaukset',
    autoConfigureNotice:
      'Tämä yhteys tukee automaattista muutosten havaitsemista. Kun luot tilauksen, liitin alkaa automaattisesti kuuntelemaan muutoksia ulkoisessa järjestelmässä ja ilmoittamaan Irminille. Lisäkonfiguraatiota ei tarvita.',
    manualWebhookNotice:
      'Alla oleva webhook-URL ja -token ovat vain edistyneisiin käyttötapauksiin, kuten mukautettuihin integraatioihin tai virheenkorjaukseen. Useimmissa tapauksissa liitin hoitaa ilmoitukset automaattisesti.',
    create: 'Luo tilaus',
    createTitle: 'Luo tilaus',
    createDescription:
      'Tilaa datamuutokset tästä yhteydestä. Saat webhook-ilmoitukset kun data muuttuu.',
    editTitle: 'Muokkaa tilausta',
    editDescription: 'Päivitä tilauksen asetukset ja suodatuskonfiguraatio.',
    activeHelp:
      'Kun poistettu käytöstä, tätä tilausta käyttävät webhookit hylätään.',
    noSubscriptions: 'Ei tilauksia vielä',
    status: 'Tila',
    active: 'Aktiivinen',
    inactive: 'Ei-aktiivinen',
    eventTypes: 'Tapahtumatyypit',
    selectEventTypes: 'Valitse tapahtumatyypit',
    allEvents: 'Kaikki tapahtumat',
    filterPaths: 'Suodatuspolut',
    filterPathsPlaceholder: 'leads, contacts, orders',
    filterPathsHelp:
      'Pilkulla eroteltu lista poluista tapahtumien suodattamiseen (tyhjä = kaikki)',
    allPaths: 'Kaikki polut',
    namePlaceholder: 'esim. CRM-liidien muutokset',
    descriptionPlaceholder: 'esim. Tilaa liidimuutokset CRM:stä',
    webhookCredentials: 'Webhook-tunnisteet',
    webhookCredentialsDescription:
      'Tallenna nämä tunnisteet turvallisesti. Tokenia ei näytetä uudelleen.',
    webhookUrl: 'Webhook URL',
    webhookToken: 'Webhook-token',
    tokenWarning:
      'Tämä token näytetään vain kerran. Tallenna se turvallisesti ennen tämän dialogin sulkemista.',
    copyWebhookUrl: 'Kopioi webhook URL',
    regenerateToken: 'Uusi token',
  },

  connectors: {
    connector: 'Yhdistin',
    version: 'Versio',
    author: 'Tekijä',
    authorEmail: 'Tekijän sähköposti',
    categories: 'Kategoriat',
    capabilities: 'Toiminallisuudet',
    capabilitiesDescription: {
      pull: 'Voi tuoda dataa ulkoisesta lähteestä',
      push: 'Voi viedä dataa ulkoiseen lähteeseen',
      apply_patch: 'Voi vastaanottaa ja soveltaa muutoksia',
      patch_event: 'Voi lähettää muutostapahtumia',
    },
    locales: 'Kielet',
    customConnectorNotAvailable:
      'Tämä ominaisuus ei ole vielä käytettävissä. Ota yhteyttä tukeen rakentaaksesi ja käyttääksesi omia yhdistimiä.',
  },

  // === WORKFLOWS ===
  workflow: {
    workflows: 'Prosessit',
    scheduledWorkflows: 'Ajastetut työnkulut',
    allWorkflowRuns: 'Kaikki prosessin ajot',
    recentRuns: 'Viimeisimmät ajot',
    importWorkflows: 'Tuontiprosessit',
    actionWorkflows: 'Toimintoprosessit',
    exportWorkflows: 'Vientiprosessit',
    pipelineWorkflows: 'Dataputkiprosessit',
    actions: 'Toiminnot',
    imports: 'Tuonnit',
    exports: 'Viennit',
    pipelines: 'Dataputket',
    triggerRun: 'Käynnistä ajo',
    workflow: 'Prosessi',
    import: 'Tuonti',
    action: 'Toiminto',
    export: 'Vienti',
    run: 'Ajo',
    noStatus: 'Ei statusta',
    startedAt: 'Aloitettu',
    finishedAt: 'Valmis',
    scheduled: 'Aikataulutettu',
    notScheduled: 'Ei aikataulutettu',
    scriptInputData: 'Syötteet',
    selectRepository: 'Valitse data-arkisto',
    selectConnection: 'Valitse yhteys',
    executableType: 'Suoritettavan tyyppi',

    scriptInputFiles: {
      title: 'Skriptin syötetiedostot',
      inputFile: 'Syötetiedosto',
      addInputFile: 'Lisää syötetiedosto',
      path: 'Polku',
      save: 'Tallenna syötetiedostot',
    },
    scriptResultDestinationRepository: 'Tuloksen data-arkisto',
    scriptResultDestinationBranch: 'Tuloksen haara',
    scriptResultDestinationPath: 'Tuloksen polku',
    importSourceConnection: 'Tuonnin lähdeyhteys',
    importSourceConnectionPath: 'Tuonnin lähdeyhteyden polku',
    importDestinationRepository: 'Tuonnin kohdedata-arkisto',
    importDestinationBranch: 'Tuonnin kohdehaara',
    importDestinationPath: 'Tuonnin kohdepolku',
    exportDestinationConnection: 'Viennin kohdeyhteys',
    exportDestinationConnectionPath: 'Viennin kohdeyhteyden polku',
    exportSourceRepository: 'Vientilähteen data-arkisto',
    exportSourceBranch: 'Vientilähteen haara',
    exportSourcePath: 'Vientilähteen polku',
    syncMode: 'Synkronointitila',
    syncModeAuto: 'Automaattinen',
    syncModeFull: 'Täysi',
    syncModePatch: 'Päivitys',
    syncModeDescription:
      'Automaattinen: Täysi synkronointi aikataululla, päivitys tapahtumilla. Täysi: Aina täysi synkronointi. Päivitys: Vain päivityspohjainen synkronointi (vaatii tapahtuman).',
    syncModeImportExplanation:
      'Synkronointitila määrittää miten data tuodaan. "Automaattinen"-tilassa ajastetut tuonnit suorittavat täyden synkronoinnin, kun taas yhteystapahtumien laukaisemana tuodaan vain muuttuneet tiedot (päivitykset). Käytä "Päivitys"-tilaa kun yhteytesi lähettää muutostapahtumia ja haluat vain inkrementaalisia päivityksiä.',
    syncModeExportExplanation:
      'Synkronointitila määrittää miten data viedään. "Automaattinen"-tilassa ajastetut viennit lähettävät kaiken datan, kun taas repositoriotapahtumien laukaisemana lähetetään vain muuttuneet tiedot (päivitykset). Käytä "Päivitys"-tilaa inkrementaalisiin vienteihin kun kohdeyhteys tukee päivitysten soveltamista.',
    triggeredBy: 'Laukaisija',
    duration: 'Kesto',
    addPath: 'Lisää polku',
    removePath: 'Poista polku',
    tabs: {
      data: 'Data',
      schedule: 'Aikataulu',
    },
    settings: {
      saveChanges: 'Tallenna muutokset',
      deletionNote:
        'Poistamalla tämän prosessin poistetaan kaikki siihen liittyvä data. Tätä toimintoa ei voi peruuttaa.',
      delete: 'Poista prosessi',
      resumeWorkflow: 'Jatka',
      pauseWorkflow: 'Pysäytä',
    },
    create: {
      createNewWorkflow: 'Luo uusi prosessi',
      createNewActionWorkflow: 'Luo uusi toimintoprosessi',
      createNewImportWorkflow: 'Luo uusi tuontiprosessi',
      createNewExportWorkflow: 'Luo uusi vientiprosessi',
      createNewPipelineWorkflow: 'Luo uusi dataputkiprosessi',
      selectWorkflowType: 'Valitse prosessityyppi',
      configureFieldMappings: 'Kenttien kartoitus',
      configureImport: 'Määritä tuonti',
      configureAction: 'Määritä toiminto',
      configureExport: 'Määritä vienti',
      configurePipeline: 'Määritä dataputki',
      configureWorkflow: 'Määritä prosessi',
      confirmAndCreate: 'Vahvista ja luo',
      confirmAndContinue: 'Vahvista ja jatka',
      goBack: 'Mene takaisin',
      typeDescription: {
        import:
          'Tuontiprosessit helpottavat tietojen tuomista ulkoisista lähteistä Irmin-säilöihin.',
        export:
          'Vientiprosessit mahdollistavat tietojen siirron Irmin-säilöistä ulkoisiin järjestelmiin tai kohteisiin.',
        action:
          'Toimintoprosessit suorittavat mukautettua koodia, joka hyväksyy syötteen ja palauttaa tuloksen.',
        pipeline:
          'Dataputkiprosessit siirtävät tietoja useiden vaiheiden läpi, välittäen tuloksia vaiheesta seuraavaan.',
      },
      validation: {
        workflowableConfigurationMissing: 'Prosessin konfiguraatio puuttuu',
        pleaseSelectConnection: 'Valitse yhteys',
        pleaseSelectDestinationRepository: 'Valitse kohdedata-arkisto',
        pleaseSpecifyDestinationBranch: 'Määritä kohdehaara',
        pleaseSpecifyDestinationPathInRepository:
          'Määritä kohdepolku data-arkistossa',
        pleaseAddAtLeastOneSourcePathFromConnection:
          'Lisää vähintään yksi lähdepolku yhteydestä',
        pleaseSelectSourceRepository: 'Valitse lähdedata-arkisto',
        pleaseSpecifySourceBranch: 'Määritä lähdehaara',
        pleaseSpecifyDestinationPathInConnection:
          'Määritä kohdepolku yhteydessä',
        pleaseAddAtLeastOneSourcePathFromRepository:
          'Lisää vähintään yksi lähdepolku data-arkistosta',
        pleaseSelectExecutableScript: 'Valitse suoritettava skripti',
        pleaseSelectExecutableQuery: 'Valitse suoritettava kysely',
        pleaseEnterWorkflowName: 'Anna prosessin nimi',
        pleaseAddAtLeastOnePipelineStage:
          'Lisää vähintään yksi dataputken vaihe',
        pleaseSpecifyResultsRepositoryBranch:
          'Määritä haara tulosten data-arkistolle',
        pleaseSpecifyResultsRepositoryPath:
          'Määritä polku tulosten data-arkistolle',
      },
      failedToCreateWorkflow: 'Prosessin luominen epäonnistui',
      workflowCreatedSuccessfully: 'Prosessi luotiin onnistuneesti',
    },
    pipeline: {
      pipeline: 'Dataputki',
      addStage: 'Lisää vaihe',
      descriptionPlaceholder: 'Kuvaile, mitä tämä dataputken vaihe tekee',
      foldAll: 'Sulje kaikki',
      unfoldAll: 'Avaa kaikki',
      write: 'Kirjoita',
      writeDescription: 'Käytä edellisten vaiheiden tuloksia',
      read: 'Lue',
      readDescription: 'Välitä tulokset seuraaville vaiheille',
      firstStageCannotWrite:
        'ensimmäinen vaihe ei voi käyttää edellisiä tuloksia',
      lastStageCannotRead:
        'viimeisellä vaiheella ei ole seuraavia vaiheita, joille välittää tulokset',
      executableScript: 'Suoritettava skripti',
      executableQuery: 'Suoritettava kysely',
      connectionWritePath: 'Kirjoittamisen polku',
      connectionWritePathDescription:
        'Polku, johon data kirjoitetaan (esim. /path/to/write)',
      connectionReadPath: 'Lukupolku',
      connectionReadPathDescription:
        'Polku, josta data luetaan (esim. /path/to/read)',
      moveUp: 'Siirrä ylös',
      moveDown: 'Siirrä alas',
      savePipelineStages: 'Tallenna vaiheet',
      noStages: 'Ei vaiheita',
      repositoryAction: 'Arkistotoiminto',
      triggerWorkflow: 'Käynnistä prosessi',
      actionType: 'Toiminnon tyyppi',
      commit: 'Commit',
      merge: 'Yhdistä',
      revert: 'Palauta',
      delete: 'Poista',
      targetBranch: 'Kohdehaara',
      mergeStrategy: 'Yhdistämisstrategia',
      mergeStrategyDefault: 'Oletus',
      mergeStrategyOurs: 'Meidän',
      mergeStrategyTheirs: 'Heidän',
      mergeStrategyRecursive: 'Rekursiivinen',
      squashCommits: 'Yhdistä commitit',
      squashCommitsDescription: 'Yhdistä kaikki commitit yhdeksi',
      allowEmptyCommits: 'Salli tyhjät commitit',
      allowEmptyCommitsDescription: 'Salli yhdistäminen ilman muutoksia',
      commitMessage: 'Commit-viesti',
      commitMessagePlaceholder: 'Automatisoitu commit prosessista',
      revertPath: 'Palautuksen polku',
      deletePath: 'Poistettava polku',
      validation: 'Validointi',
      validationMode: 'Validointitila',
      validationModeSingle:
        'Yksittäinen tiedosto (aakkosjärjestyksessä ensimmäinen)',
      validationModeAll: 'Kaikki tiedostot',
      failOnError: 'Epäonnistu validointivirheessä',
      validationTargetName: 'Kohdetiedoston nimi (valinnainen)',
      validationTargetNamePlaceholder: 'esim. asiakkaat.json',
      validationSchema: 'Validointiskeema',
      transform: 'Muunnos',
      transformOperation: 'Muunnostoiminto',
      transformFieldRename: 'Nimeä kentät uudelleen',
      transformFieldRemove: 'Poista kentät',
      transformFileRename: 'Nimeä tiedosto uudelleen',
      transformFileRemove: 'Poista tiedosto',
      transformFormatConvert: 'Muunna formaatti',
      transformMode: 'Muunnostila',
      transformModeSingle: 'Yksittäinen tiedosto',
      transformModeAll: 'Kaikki tiedostot',
      transformTargetName: 'Kohdetiedoston nimi',
      transformTargetNamePlaceholder: 'esim. asiakkaat.csv',
      transformFieldRenames: 'Kenttien uudelleennimeämiset',
      transformOldFieldName: 'Alkuperäinen nimi',
      transformNewFieldName: 'Uusi nimi',
      addFieldRename: 'Lisää kenttäuudelleennimeäminen',
      transformFieldsToRemove: 'Poistettavat kentät',
      transformFieldsToRemovePlaceholder: 'kenttä1, kenttä2, kenttä3',
      transformFieldsToRemoveHint:
        'Pilkulla erotettu lista poistettavien kenttien nimistä',
      transformOutputName: 'Tiedoston nimi',
      transformOutputNamePlaceholder: 'esim. tulos.csv',
      transformOutputFormat: 'Tulostusformaatti',
      embeddings: 'Upotukset',
      embeddingsOperation: 'Toiminto',
      embeddingsVectorize: 'Vektorisoi',
      embeddingsSearch: 'Hae',
      embeddingsRepository: 'Arkisto',
      embeddingsRepositoryPlaceholder: 'Valitse arkisto',
      embeddingsBranch: 'Haara',
      embeddingsModel: 'Malli',
      embeddingsDimensions: 'Dimensiot',
      embeddingsChunkSize: 'Palan koko',
      embeddingsOverlap: 'Päällekkäisyys',
      embeddingsOutputPath: 'Tulostuspolku',
      embeddingsOutputPathPlaceholder: 'esim. upotukset/dokumentit.parquet',
      embeddingsPath: 'Upotustiedoston polku',
      embeddingsPathPlaceholder: 'esim. upotukset/dokumentit.parquet',
      embeddingsQuery: 'Hakukysely',
      embeddingsQueryPlaceholder: 'Kirjoita hakukysely...',
      embeddingsTopK: 'Tulosten määrä',
      embeddingsPriority: 'Prioriteetti',
      embeddingsPriorityDescription:
        'Korkeamman prioriteetin upotukset suositaan RAG-haussa (0.0-1.0)',
      stageTypeDescription: {
        action:
          'Toimintovaiheet suorittavat mukautettuja skriptejä datan käsittelyyn, vastaanottaen syötettä edellisistä vaiheista ja tuottaen tulosta seuraaville vaiheille.',
        connection:
          'Yhteyden vaiheet vuorovaikuttavat ulkoisten tietolähteiden kanssa, lukien tai kirjoittaen yhteyksiin kuten tietokantoihin, API:hin tai tiedostojärjestelmiin.',
        repository:
          'Arkiston vaiheet lukevat tai kirjoittavat Irmin-arkistoihin, mahdollistaen datan versionhallinnan ja tallennuksen prosessin työnkulussa.',
        validation:
          'Validointivaiheet tarkistavat saapuvan datan määriteltyä skeemaa vasten, varmistaen datan laadun ja johdonmukaisuuden ennen seuraaviin putkilinjan vaiheisiin siirtymistä.',
        transform:
          'Muunnosvaiheet muokkaavat dataa nimeämällä kenttiä uudelleen, poistamalla kenttiä, nimeämällä tiedostoja uudelleen tai muuntamalla formaatteja (CSV, JSON, Parquet).',
        embeddings:
          'Upotukset-vaiheet luovat dokumenteista vektori esityksiä semanttista hakua varten tai etsivät olemassa olevista upotuksista luonnollisen kielen kyselyillä.',
        patch:
          'Päivitysvaiheet soveltavat inkrementaalisia muutoksia saapuvista tapahtumista arkistoihin tai yhteyksiin, mahdollistaen reaaliaikaisen datasynkronoinnin.',
        field_mapping:
          'Kenttämääritysvaiheet soveltavat kenttätason muunnoksia dataan, mukaan lukien kenttien uudelleennimeäminen, tyyppien muuntaminen ja sisäkkäisten JSON-rakenteiden purkaminen.',
      },
      fieldMapping: 'Kenttämääritys',
      fieldMappingMode: 'Kohdetila',
      fieldMappingTargetName: 'Kohdetiedoston nimi',
      fieldMappingOutputName: 'Tulostiedoston nimi',
      patch: 'Päivitys',
      patchDirection: 'Päivityssuunta',
      patchToRepository: 'Arkistoon',
      patchToConnection: 'Yhteyteen',
      patchSourceFile: 'Lähdetiedosto',
      patchSourceFileHelp:
        'Päivitysdatan sisältävä tiedosto (oletus: trigger_event.json yhteystapahtumasta)',
      patchTargetPath: 'Kohdepolku',
      patchStageExplanation:
        'Päivitysvaihe soveltaa inkrementaalisia muutoksia (JSON-päivityksiä) lähdetiedostosta joko arkistoon tai yhteyteen. Käytä "Arkistoon" soveltaaksesi saapuvia päivityksiä (esim. yhteystapahtumista) dataasi. Käytä "Yhteyteen" lähettääksesi päivityksiä (esim. arkistomuutoksista) ulkoiseen järjestelmään.',
      dataPassMode: 'Datan välitystapa',
      dataPassModeMerge: 'Yhdistä',
      dataPassModeReplace: 'Korvaa',
      dataPassModeMergeDescription:
        'Lisää tai muokkaa tiedostoja putken datassa',
      dataPassModeReplaceDescription:
        'Korvaa kaikki putken data tämän vaiheen tulosteella',
      outputPreview: 'Odotettu tuloste',
      outputPreviewDynamic: 'Tuloste määräytyy suorituksen aikana',
    },
    schedule: {
      workflowSchedule: 'Prosessin aikataulu',
      trigger: 'Laukaisin',
      timeTrigger: 'Aikapohjainen laukaisin',
      repositoryEventTrigger: 'Data-arkiston tapahtumalaukaisin',
      workflowRunEventTrigger: 'Prosessin ajotapahtuma-laukaisin',
      connectionEventTrigger: 'Yhteyden tapahtumalaukaisin',
      selectConnection: 'Valitse yhteys',
      connectionEventType: 'Tapahtumatyyppi',
      anyEvent: 'Mikä tahansa tapahtuma',
      connectionPaths: 'Suodatuspolut',
      connectionPathsPlaceholder: 'leads, contacts, orders',
      connectionPathsHelp:
        'Pilkulla eroteltu lista poluista tapahtumien suodattamiseen (tyhjä = kaikki)',
      addTrigger: 'Lisää laukaisin',
      maxRetries: 'Enimmäisyritykset',
      maxRuntime: 'Maksimiaika (sekunteina)',
      minInterval: 'Minimiaika (sekunteina)',
      triggerType: 'Laukaisimen tyyppi',
      timeFormat: 'Aikamuoto',
      recurrenceRule: 'Toistumissääntö',
      cronExpression: 'Cron-lauseke',
      event: 'Tapahtuma',
      saveSchedule: 'Tallenna aikataulu',
      presets: 'Pohjat',
      custom: 'Mukautettu',

      // Trigger details
      manualTrigger: 'Manuaalinen laukaisin',
      scheduledTrigger: 'Aikataulutettu laukaisin',
      unknownTrigger: 'Tuntematon laukaisin',
      noTriggerInformation: 'Ei laukaisintietoja',
      rawTriggerData: 'Raaka laukaisintiedot',
      sourceWorkflow: 'Lähdeprosessi',
      cron: {
        selectPreset: 'Valitse aikataulupohja',
        generatedCron: 'Luotu Cron-lauseke',
        nextExecutionTimes: 'Seuraavat suoritusajat',
        invalidCron: 'Virheellinen cron-lauseke. Tarkista syntaksi.',
        minutes: 'Minuutit',
        hours: 'Tunnit',
        dayOfMonth: 'Kuukauden päivä',
        month: 'Kuukausi',
        dayOfWeek: 'Viikonpäivä',
        everyMinute: 'Joka minuutti (*)',
        everyHour: 'Joka tunti (*)',
        everyDay: 'Joka päivä (*)',
        everyMonth: 'Joka kuukausi (*)',
        everyWeekday: 'Joka päivä (*)',
        specificMinute: 'Tietty minuutti',
        specificHour: 'Tietty tunti',
        specificDay: 'Tietty päivä',
        specificMonth: 'Tietty kuukausi',
        specificWeekday: 'Tietty viikonpäivä',
        cronSyntax: 'Cron-syntaksi',
        cronSyntaxDescription: 'Cron-lauseke koostuu 5 kentästä:',
        cronSyntaxNote: '* = mikä tahansa arvo, 0 = sunnuntai viikonpäivälle',
        copyToClipboard: 'Kopioi leikepöydälle',
        copied: 'Kopioitu!',
        copyCron: 'Kopioi cron-lauseke',
        cronSyntaxHelp: 'Cron-syntaksin ohje',
      },
      rrule: {
        selectPreset: 'Valitse esiasetettu aikataulu',
        generatedRRule: 'Luotu RRule',
        nextExecutionTimes: 'Seuraavat ajat',
        invalidRRule: 'Virheellinen RRule. Tarkista asetukset.',
        frequency: 'Toistuvuus',
        interval: 'Väli',
        weekdays: 'Viikonpäivät',
        startDate: 'Aloituspäivä',
        none: 'Ei mitään',
        everyDay: 'Joka päivä',
        selected: 'valittu',
        rruleSyntax: 'Toistumissäännön syntaksi',
        rruleSyntaxDescription:
          'Toistumissääntö (RRule) on standardoitu muoto toistuvien tapahtumien määrittelyyn. Yleisimmät vaihtoehdot:',
        rruleSyntaxOptions: {
          freq: 'FREQ: Toistuvuus (SECONDLY, MINUTELY, HOURLY, DAILY, WEEKLY, MONTHLY, YEARLY)',
          interval: 'INTERVAL: Toistuvuuden väli',
          byday: 'BYDAY: Viikonpäivät (MO, TU, WE, TH, FR, SA, SU)',
          byhour: 'BYHOUR: Päivän tunnit (0-23)',
          byminute: 'BYMINUTE: Tunnin minuutit (0-59)',
        },
        copyToClipboard: 'Kopioi leikepöydälle',
        copied: 'Kopioitu!',
        copyRRule: 'Kopioi toistumissääntö',
        rruleSyntaxHelp: 'Toistumissäännön syntaksin ohje',
      },
    },
  },

  // === DEVELOPMENT TOOLS ===
  scripts: {
    script: 'Skripti',
    writeYourJS: 'Kirjoita JavaScriptisi tähän...',
    writeYourGo: 'Kirjoita Go-skriptisi tähän...',
    writeYourSQL: 'Kirjoita SQL-kyselysi tähän...',
    writeYourPython: 'Kirjoita Python-koodisi tähän...',
    writeYourText: 'Kirjoita teksti tähän...',
    writeYourMarkdown: 'Kirjoita Markdown-tekstisi tähän...',
    writeYourJSON: 'Kirjoita JSON-objektisi tähän...',
    newScriptTitle: 'Luo uusi skripti',
    newScriptSubtitle:
      'Kirjoita skripti haluamallasi kielellä ja tallenna se prosessina',
    browseRepositories: 'Selaa data-arkistoja',
    browseRepositoriesDescription:
      'Selaa data-arkistoja löytääksesi ne, joissa haluat kirjoittaa skriptin',
    scriptExecutionStarted: 'Skriptin suoritus aloitettu',
    scriptNeedsToBeSaved:
      'Skripti on tallennettava ennen suorittamista. Tallenna skripti ja suorita se uudelleen.',
    selectScript: 'Valitse skripti',
    searchScripts: 'Hae skriptejä...',
    createScript: 'Luo skripti',
    updateScript: 'Päivitä skripti',
    owner: 'Omistaja',
    scriptManagement: 'Skriptien hallinta',
    scriptName: 'Skriptin nimi',
    scriptDescription: 'Skriptin kuvaus',
    scriptNotFound: 'Skriptiä ei löytynyt. Palautetaan tyhjä editori.',
    scriptDeleted: 'Skripti poistettiin. Palautetaan tyhjä editori.',
    unsavedChangesDiscard:
      'Sinulla on tallentamattomia muutoksia. Haluatko hylätä ne?',
    failedToCreateScript: 'Skriptin luominen epäonnistui',
    failedToUpdateScript: 'Skriptin päivitys epäonnistui',
    saving: 'Tallennetaan...',
    reset: 'Palauta',
  },

  query: {
    query: 'Kysely',
    queries: 'Kyselyt',
    queryExecutionStarted: 'Kyselyn suoritus aloitettu',
    results: 'Tulokset',
    errors: 'Virheet',
    queryResults: 'Kyselyn tulokset',
    createQuery: 'Luo kysely',
    saveQuery: 'Tallenna kysely',
    run: 'Suorita',
    rowsReturnedIn: 'riviä palautettu ajassa',
    exportTable: 'vie taulukko (.csv)',
    search: 'Hae tuloksista',
    newQuery: 'Uusi kysely',
    selectedQuery: 'Valittu kysely',
    editor: 'SQL-editori',
    queryNotFound: 'Kyselyä ei löytynyt',
    queryDeleted: 'Kyselyä ei ole enää saatavilla',
    searchQueries: 'Hae kyselyjä...',
    failedToCreateQuery: 'Kyselyn luominen epäonnistui',
    failedToUpdateQuery: 'Kyselyn päivitys epäonnistui',
    saveAs: 'Tallenna nimellä',
  },

  queryHelper: {
    title: 'SQL-syntaksiavustaja',
    poweredBy: 'DuckDB:n voimalla',
    duckDbDescription:
      'Irmin käyttää DuckDB:tä, suorituskykyistä analytiikkatietokantaa. Kaikki standardi SQL-syntaksi ja DuckDB:n erityisfunktiot ovat tuettuja.',
    duckDbDocs: 'DuckDB SQL-dokumentaatio',
    context: 'Kyselyn konteksti',
    recommended: 'Suositeltu',
    placeholderSyntax: 'Paikkamerkkisyntaksi',
    placeholderDescription:
      'Irmin käyttää erityistä paikkamerkkisyntaksia viitatakseen dataan eri työtilojen, data-arkistojen ja versioiden välillä. Tämä on suositeltu syntaksi useimmissa käyttötapauksissa.',
    placeholderSyntaxNote:
      'Ref (haara/commit) on valinnainen. Työtila on valinnainen, jos ajetaan samassa työtilassa.',
    alternativeS3Syntax: 'Vaihtoehto: Natiivi DuckDB S3 -syntaksi',
    alternativeS3Description:
      'Edistyneissä käyttötapauksissa voit myös käyttää natiiveja DuckDB-funktioita suorilla S3-poluilla.',
    s3FormatNote: 'S3-muoto: s3://työtila-arkisto/haara/polku',
    alternativeS3Example: 'Natiivi DuckDB S3 -syntaksi (Vaihtoehto)',
    alternativeS3ExampleExplanation:
      'Käytä natiiveja DuckDB-funktioita S3-poluilla edistyneissä käyttötapauksissa. Molemmat syntaksit pakottavat samat käyttöoikeudet.',
    examples: 'Kyselyesimerkit',
    basicQueries: 'Peruskyselyt',
    advancedAnalytics: 'Kehittynyt analytiikka',
    jsonOperations: 'JSON-operaatiot',
    crossRepoAndBranch: 'Repositorioiden ja haarojen välillä',
    queryDocumentationTab: 'SQL-syntaksi',
    generateSql: 'Generoi SQL',
    copySelector: 'Kopioi valitsin',
    availableColumns: 'Saatavilla olevat sarakkeet',
    basicSelect: 'Perusvalinta',
    filterAndSort: 'Suodatus ja lajittelu',
    aggregations: 'Aggregaatiot',
    windowFunctions: 'Ikkunafunktiot',
    nestedJson: 'Sisäkkäinen JSON (UNNEST)',
    jsonExtract: 'Poimi JSON-kentät',
    crossBranchQuery: 'Haarojen välinen kysely',
    timeSeries: 'Aikasarja-analyysi',
    writeOperations: 'Kirjoitusoperaatiot',
    exportResults: 'Vie kyselytulokset',
    tempViewWithQuery: 'Väliaikainen näkymä + kysely',
    joinExport: 'Vie JOIN-tulokset',
    aggregationExport: 'Vie aggregaatit',
    multiStepTransform: 'Monivaiheinen muunnos',
    queryInputsOutputs: 'Kyselyjen syötteet ja tulosteet',
    workflowInputs: 'Työnkulun syötetiedostot',
    inputFileProcessing: 'Käsittele syötetiedostoja',
    multipleInputJoin: 'Yhdistä useita syötteitä',
    queryOutputFormat: 'Kyselyn tulosteen muoto',
    explanations: {
      basicSelect: 'Hae ensimmäiset 10 riviä objektista.',
      filterAndSort:
        'Suodata rivit id:n mukaan ja lajittele luontipäivämäärän mukaan.',
      aggregations: 'Ryhmittele data kategorioittain ja laske tilastot.',
      windowFunctions: 'Laske sijoitus ja edelliset arvot ikkunafunktioilla.',
      nestedJson: 'Laajenna "data"-taulukko riveiksi kyselläksesi sen kenttiä.',
      jsonExtract: 'Poimi tietyt kentät JSON-merkkijonosarakkeesta.',
      crossBranchQuery: 'Yhdistä tulokset main- ja dev-haaroista.',
      timeSeries: 'Aggregoi data tunneittain trendien analysoimiseksi.',
      exportResults:
        'Käytä COPY TO viedäksesi kyselytulokset LakeFSiin. Vaatii kirjoitusoikeudet kohderepositoryyn ja haaraan.',
      tempViewWithQuery:
        'Luo väliaikaisia näkymiä monimutkaisille kyselyille ja kysy niistä. Useita lauseita erotetaan puolipisteillä.',
      joinExport:
        'Vie JOIN-kyselyjen tulokset yhdistämällä useita tietolähteitä. Hyödyllinen rikastettujen tietoaineistojen luomiseen.',
      aggregationExport:
        'Vie aggregoidut analytiikkatiedot (GROUP BY, COUNT, AVG, SUM) suoraan tiedostoihin. Täydellinen raportteihin ja hallintapaneeleihin.',
      multiStepTransform:
        'Käytä useita väliaikaisia tauluja monimutkaisten tietomuunnosten rakentamiseen vaihe vaiheelta, ja vie lopulliset tulokset.',
      workflowInputs:
        'Työnkuluissa syötetiedostot ladataan automaattisesti virtuaalitauluiksi. Taulujen nimet johdetaan tiedostopoluista (esim. /data/customers.csv → data_customers_csv).',
      inputFileProcessing:
        'Suodata ja muunna dataa työnkulun syötetiedostoista. Syötetiedostot ladataan virtuaalitauluiksi polkujensa perusteella.',
      multipleInputJoin:
        'Yhdistä useita syötetiedostoja, jotka on ladattu virtuaalitauluiksi. Täydellinen eri lähteistä tulevan datan yhdistämiseen työnkuluissa.',
      queryOutputFormat:
        'Kyselytulokset muunnetaan automaattisesti CSV-muotoon (query_results.csv). Tuloste voidaan tallentaa repositoryihin tai välittää seuraaville putkilinjan vaiheille.',
    },
    sqlGeneration: {
      placeholder: 'Kuvaile mitä haluat kysellä...',
      send: 'Lähetä',
      generatedSql: 'Luotu SQL',
      copySql: 'Kopioi SQL',
      response: 'Vastaus',
      clearChat: 'Tyhjennä',
      loading: 'Luodaan SQL:ää...',
      error: 'SQL:n luominen epäonnistui',
      noMessages: 'Aloita keskustelu luodaksesi SQL-kyselyitä',
    },
  },

  fileNavigator: {
    open: 'Avaa',
    root: 'Juuri',
    rootDirectory: 'Juurihakemisto',
    deleteConfirmation: 'Oletko varma, että haluat poistaa',

    errors: {
      invalidPath: 'Virheellinen polku',
    },
  },

  // === WIZARDS ===
  wizard: {
    // Wizard Selector
    dataImport: 'Datan tuonti',
    dataImportDescription: 'Tuo dataa ulkoisista lähteistä data-arkistoihisi',
    dataExport: 'Datan vienti',
    dataExportDescription: 'Vie dataa data-arkistoista ulkoisiin kohteisiin',
    repositoryDescription: 'Luo uusi data-arkisto',
    connectionDescription: 'Yhdistä ulkoisiin tietolähteisiin',
    workflowDescription: 'Luo automatisoituja datatyökuluja',

    // Data Import Wizard Steps
    connectDataSource: 'Tietolähde',
    setupRepository: 'Säilytys',
    configure: 'Konfiguroi',
    reviewAndCreate: 'Tarkista ja luo',
    setupDataImportWizard: 'Aseta datan tuontiohjattu',
    setupDataExportWizard: 'Aseta datan vientiohjattu',

    // Data Export Wizard Steps
    selectDestination: 'Kohde',
    selectRepository: 'Data-arkisto',
    selectExportDestination: 'Valitse vientikohde',
    selectExportDestinationDescription: 'Valitse mihin haluat viedä datasi',
    selectSourceRepository: 'Valitse lähdedata-arkisto',
    selectSourceRepositoryDescription:
      'Valitse data-arkisto josta haluat viedä dataa',
    configureExportSettings: 'Konfiguroi vientiasetukset',
    configureExportSettingsDescription:
      'Konfiguroi kuinka dataa viedään data-arkistostasi kohteeseen',
    reviewAndCreateExportWorkflow: 'Tarkista ja luo vientityökulu',
    reviewAndCreateExportWorkflowDescription:
      'Tarkista konfiguraatiosi ja luo vientityökulu',

    // Connect Data Source Step
    connectToDataSource: 'Yhdistä tietolähteeseesi',
    connectToDataSourceDescription:
      'Valitse miten haluat yhdistää tietolähteeseesi. Voit käyttää olemassa olevaa yhteyttä tai luoda uuden.',
    useExistingConnection: 'Käytä olemassa olevaa yhteyttä',
    createNewConnection: 'Luo uusi yhteys',
    selectFromExistingConnections: 'Valitse olemassa olevista yhteyksistä',
    setupNewConnectionToDataSource: 'Aseta uusi yhteys tietolähteeseesi',
    selectConnection: 'Valitse yhteys',
    searchConnections: 'Hae yhteyksiä...',
    pleaseSelectConnection: 'Valitse yhteys',
    noConnectionsFound: 'Yhteyksiä ei löytynyt hakuasi vastaavasti.',
    noConnectionsAvailable: 'Ei yhteyksiä saatavilla.',
    noDescription: 'Ei kuvausta',
    goToSupportPage: 'Siirry tukisivulle',

    // Setup Repository Step
    setupRepositoryDescription:
      'Valitse mihin haluat tallentaa tuotavan datan. Voit käyttää olemassa olevaa data-arkistoa tai luoda uuden.',
    selectFromExistingRepositories:
      'Valitse olemassa olevista data-arkistoista',
    searchRepositories: 'Hae data-arkistoja...',
    defaultBranch: 'Oletushaara:',
    pleaseSelectRepository: 'Valitse data-arkisto',
    createNewRepositoryDescription: 'Luo uusi data-arkisto datallesi',
    noRepositoriesFound: 'Data-arkistoja ei löytynyt hakuasi vastaavasti.',
    noRepositoriesAvailable: 'Ei data-arkistoja saatavilla.',

    // Configure Import Step
    pleaseSpecifyImportPath: 'Määritä vähintään yksi tuontipolku',
    failedToConfigureImport: 'Tuontiasetusten määrittäminen epäonnistui',

    // Review and Create Step
    reviewYourSetup: 'Tarkista asetuksesi',
    reviewConfigurationDescription:
      'Tarkista asetuksesi ennen tuontiprosessin luomista.',
    importPaths: 'Tuontipolut:',
    connector: 'Yhdistin:',
    destination: 'Kohde:',
    branch: 'Haara:',
    settingUpDataImport: 'Asetetaan datan tuonti...',
    creatingConnection: 'Luodaan yhteyttä',
    creatingRepository: 'Luodaan data-arkistoa',
    creatingImportWorkflow: 'Luodaan tuontiprosessia',
    dataImportSetupCompleted:
      'Datan tuontiasetukset valmistuivat onnistuneesti!',
    failedToCompleteSetup:
      'Asetusten valmistuminen epäonnistui. Yritä uudelleen.',

    // Common wizard strings
    configureImportDescription:
      'Määritä kuinka data tuodaan yhteydestäsi data-arkistoon.',
    workflowInformation: 'Prosessin tiedot',
    repositorySettings: 'Data-arkiston asetukset',
    repositoryBranch: 'Data-arkiston haara',
    fieldMappingsDescription:
      'Kenttien yhdistäminen mahdollistaa datan muuntamisen tuonnin aikana. Tämä ominaisuus on saatavilla seuraavassa vaiheessa.',
    useExistingRepository: 'Käytä olemassa olevaa data-arkistoa',

    // Export-specific strings
    exportFromRepositoryPaths: 'Vie data-arkiston poluista',
    exportToConnectionPath: 'Vie yhteyden polkuun',
    exportPath: 'Vientipolku',
    exportPaths: 'Vientipolut',
    exportDestination: 'Vientikohde',
    sourceRepository: 'Lähdedata-arkisto',
    workflowDetails: 'Prosessin tiedot',
    workflowName: 'Prosessin nimi',
    creatingExportWorkflow: 'Luodaan vientiprosessia',
    creatingWorkflow: 'Luodaan prosessia',
    createExportWorkflow: 'Luo vientiprosessi',
    exportWorkflowCreatedSuccessfully: 'Vientiprosessi luotiin onnistuneesti!',

    // Additional missing translations
    pleaseEnterWorkflowName: 'Anna prosessin nimi',
    pleaseSelectRepositoryBranch: 'Valitse data-arkiston haara',
    pleaseSelectRepositoryPaths: 'Valitse data-arkiston polut',
    pleaseSelectConnectionPath: 'Valitse yhteyden polku',
    workflowNamePlaceholder: 'Anna prosessin nimi',
    workflowDescriptionPlaceholder: 'Anna prosessin kuvaus',
    workflowDocumentationPlaceholder: 'Anna prosessin dokumentaatio',
    repositoryBranchPlaceholder: 'Anna data-arkiston haara',
    workflowDocumentation: 'Prosessin dokumentaatio',
    connection: 'Yhteys',
    repository: 'Data-arkisto',
    documentation: 'Dokumentaatio',
    fieldMappingsNotAvailableNewResources:
      'Kenttien kartoitus ei ole käytettävissä uusia yhteyksiä tai data-arkistoja luotaessa. Voit määrittää kenttien kartoituksen prosessin luomisen jälkeen.',
    fieldMappingsNotAvailable:
      'Kenttien kartoitus ei ole käytettävissä tällä hetkellä.',
  },

  // === ASSISTANT ===
  assistant: {
    // Assistant Section
    title: 'Avustaja',
    conversations: 'Keskustelut',
    noConversationSelectedDescription:
      'Valitse olemassa oleva keskustelu sivupalkista tai luo uusi aloittaaksesi keskustelun tekoälyavustajan kanssa.',
    noMessagesInTheConversation: 'Keskustelussa ei ole viestejä',
    noMessagesInTheConversationDescription:
      'Tässä keskustelussa ei ole viestejä. Aloita lähettämällä viesti avustajan kanssa.',
    assistantInterfaceError: 'Avustajakäyttöliittymän virhe',
    failedToLoadAssistantInterface:
      'Avustajakäyttöliittymän lataaminen epäonnistui',
    openInFullPage: 'Avaa täysikokoisessa sivussa',
    contextAwareBanner:
      'Olen tietoinen kontekstista! Näen millä sivulla olet, avoimet tiedostosi ja valitut objektit.',

    // Conversations List
    newConversation: 'Uusi keskustelu',
    noConversations: 'Ei vielä keskusteluja',
    searchConversations: 'Hae keskusteluja...',
    noSearchResults: 'Keskusteluja ei löytynyt',

    // Assistant Chat
    askMeAnything:
      'Kysy minulta mitä tahansa - ohjelmointia, liiketoimintaa, kirjoittamista tai yleisiä kysymyksiä...',

    // Chat Suggestions
    querySyntaxExamples: 'Näytä esimerkki SQL kyselystä',
    whatIsIrmin: 'Mikä Irmin on?',
    whatRepositoriesDoIHave: 'Mitkä data-arkistot minulla on?',
    whatConnectionsAndWorkflowsDoIHave:
      'Mitkä yhteydet ja työnkulut minulla on?',

    // Message Actions
    copyMessage: 'Kopioi viesti',
    messageCopied: 'Viesti kopioitu leikepöydälle',
    copyFailed: 'Viestin kopiointi epäonnistui',

    // Tool and Reasoning Elements
    iteration: 'Iteraatio',
    error: 'Virhe',
    likeThisResponse: 'Tykkää tästä vastauksesta',
    dislikeThisResponse: 'Älä tykkää tästä vastauksesta',
    thisResponseWasGeneratedThrough: 'Tämä vastaus luotiin',
    ofReasoningAndToolUsage: 'ajattelun ja työkalujen avulla',
  },

  // === USER MANAGEMENT ===
  users: {
    inviteUser: 'Kutsu käyttäjä',
    changeProfilePicture: 'Vaihda profiilikuva',
    firstName: 'Etunimi',
    lastName: 'Sukunimi',
    phone: 'Puhelinnumero',
    company: 'Yritys',
    role: 'Rooli',
    noRole: 'Ei roolia',
    updateProfile: 'Päivitä profiili',
    transferOwnership: 'Siirrä omistajuus',
    removeFromWorkspace: 'Poista työtilasta',
    resendInvite: 'Lähetä kutsu uudelleen',
    cancelInvite: 'Peruuta kutsu',
    invite: 'Kutsu',
  },

  invite: {
    acceptInvitation: 'Hyväksy kutsu',
    declineInvitation: 'Hylkää kutsu',
    workspaceInvitation: 'Kutsu työtilaan',
    workspaceInvitationDescription: 'Sinut on kutsuttu liittymään työtilaan',
    invitedBy: 'Kutsuja',
    workspace: 'Työtila',
    role: 'Rooli',
    pendingInvites: 'Odottavat kutsut',
    pendingInvitesDescription:
      'Sinut on kutsuttu liittymään seuraaviin työtiloihin',
    expires: 'Vanhenee',
    accept: 'Hyväksy',
    decline: 'Hylkää',
    accepting: 'Hyväksytään...',
    declining: 'Hylätään...',
    asRole: 'roolissa',
  },

  tokens: {
    apiTokens: 'API avaimet',
    createAPIToken: 'Luo API avain',
    validFor: 'Voimassa (sekunneissa)',
    expiresAt: 'Vanhenee',
    expiresOn: 'Vanhenee',
    revokeToken: 'Poista avain',
    yourAPIToken: 'Sinun API avain',
    storeTokenDescription:
      'Tämä avain näytetään vain kerran. Ole hyvä ja kopio se, sekä säilytä turvallisesti.',
    tokenRevealed: 'Avain näytetty',
    revealToken: 'Näytä avain',
    copied: 'Kopioitu!',
    copyToken: 'Kopioi avain',
    explainer:
      'API avaimet mahdollistavat Irmin API:n käytön tai Irmin MCP:n käytön nimissäsi, käyttöoikeuksillasi.',
    learnMoreApiDocs: 'Lue lisää API dokumentaatiosta',
    valueMustBePositive: 'Arvon on oltava positiivinen',
    valueMustBeValidNumber: 'Arvon on oltava kelvollinen numero',
    valueTooLarge: 'Arvo on liian suuri ja aiheuttaisi ylivuodon',
    durations: {
      oneHour: '1 tunti',
      sixHours: '6 tuntia',
      oneDay: '1 päivä',
      sevenDays: '7 päivää',
      thirtyDays: '30 päivää',
      ninetyDays: '90 päivää',
      custom: 'Mukautettu (sekunteina)',
    },
  },

  policy: {
    title: 'Käyttöoikeudet',
    description: 'Hallitse käyttöoikeuksia ja käyttöoikeuksia',
    addPolicy: 'Lisää käyttöoikeus',
    createPolicy: 'Luo uusi käyttöoikeus',
    editPolicy: 'Muokkaa käyttöoikeutta',
    deletePolicyDescription:
      'Haluatko varmasti poistaa tämän käyttöoikeuden? Tätä toimintoa ei voi peruuttaa.',
    effect: 'Vaikutus',
    action: 'Toiminto',
    resource: 'Resurssi',
    principal: 'Kohde',
    resourceId: 'Resurssin tunniste (valinnainen)',
    error: 'Virhe käyttöoikeuksien lataamisessa',
    noPolicies: 'Ei käyttöoikeuksia',
    creating: 'Luodaan...',
    effectAllow: 'Salli',
    effectDeny: 'Estä',
    actionRead: 'Lue',
    principalWorkspaceUser: 'Käyttäjä',
    principalRole: 'Rooli',
    principalEveryone: 'Kaikki',

    tooltips: {
      effect: 'Onko käyttöoikeus eksplisiittisesti estävä vai salliva',
      action:
        'Mikä toiminto on sallittu tai estetty (luonti, lukeminen, päivitys, poisto)',
      resource: 'Resurssin tyyppi, jolle toiminto koskee',
      principal:
        'Kenelle käyttöoikeus koskee (tietty käyttäjä, rooli tai kaikki)',
      resourceId:
        'Valinnainen tietyn resurssin tunniste. Jätä tyhjäksi koskemaan kaikkia tämän tyyppisiä resursseja',
      denyExplanation:
        'Estävät käyttöoikeudet ohittavat roolien oletukset ja peruuttavat pääsyn',
    },

    // Bulk actions
    bulkDelete: 'Poista valitut',
    bulkDeleteConfirm:
      'Haluatko varmasti poistaa valitut käyttöoikeudet? Tätä toimintoa ei voi peruuttaa.',
    policiesSelected: 'käyttöoikeutta valittu',
    clearSelection: 'Tyhjennä valinta',

    // Filters
    filterByEffect: 'Suodata vaikutuksen mukaan',
    filterByAction: 'Suodata toiminnon mukaan',
    filterByPrincipal: 'Suodata kohteen mukaan',
    filterByResource: 'Suodata resurssin mukaan',
    allEffects: 'Kaikki vaikutukset',
    allActions: 'Kaikki toiminnot',
    allPrincipals: 'Kaikki kohteet',
    allResources: 'Kaikki resurssit',

    // Batch creation
    createdPolicies: 'Luodut käyttöoikeudet',
    failedCount: 'epäonnistui',
    alreadyExisted: 'oli jo olemassa',
    batchNoSelections:
      'Valitse vähintään yksi toiminto ja yksi resurssi luodaksesi käytäntöjä.',

    // Bulk delete results
    bulkDeleteSuccess: 'Poistetut käyttöoikeudet',

    // Share
    share: {
      title: 'Jaa',
      shareThis: 'Jaa tämä',
      currentAccess: 'Nykyinen pääsy',
      addAccess: 'Lisää pääsy',
      readOnly: 'Vain luku',
      readWrite: 'Luku ja kirjoitus',
      fullAccess: 'Täysi pääsy',
      custom: 'Mukautettu',
      removeAccessConfirm:
        'Haluatko varmasti poistaa pääsyn? Tämä poistaa kaikki käyttöoikeudet tälle käyttäjälle/roolille tässä resurssissa.',
      noOneHasAccess: 'Kenellekään ei ole myönnetty erityistä pääsyä',
      accessGranted: 'Pääsy myönnetty onnistuneesti',
      grantAccessPartial:
        'Osa oikeuksista myönnettiin, mutta osa epäonnistui. Tarkista ja yritä uudelleen.',
      grantAccessFailed: 'Pääsyn myöntäminen epäonnistui. Yritä uudelleen.',
      changeLevelDeleteFailed:
        'Käyttöoikeustason päivitys epäonnistui. Olemassa olevia käyttöoikeuksia ei voitu poistaa.',
      changeLevelDeletePartial:
        'Käyttöoikeustason päivitys epäonnistui. Osa olemassa olevista käyttöoikeuksista poistettiin, mutta kaikkia ei voitu poistaa. Tarkista käyttöoikeudet manuaalisesti.',
      changeLevelCreateFailed:
        'Vanhat käyttöoikeudet poistettiin, mutta uusia ei voitu luoda. Myönnä pääsy uudelleen manuaalisesti.',
      changeLevelSuccess: 'Käyttöoikeustaso päivitetty onnistuneesti.',
      accessRemoved: 'Pääsy poistettu onnistuneesti',
      removeAccessFailed: 'Pääsyn poistaminen epäonnistui. Yritä uudelleen.',
      grantAccess: 'Myönnä pääsy',
    },

    ownerRoleProtected: 'Omistaja-roolilla on aina täysi pääsy',

    // Permission overview
    permissionOverview: {
      rolePermissions: 'Roolien käyttöoikeudet',
      userPermissions: 'Käyttäjien käyttöoikeudet',
      inheritedFromRole: 'Peritty roolilta',
      directPermission: 'Suora käyttöoikeus',
      fullAccess: 'Täysi pääsy',
      partialAccess: 'Osittainen pääsy',
      noAccess: 'Ei pääsyä',
      denied: 'Estetty',
      additionalPolicies: 'lisäkäyttöoikeutta',
    },
  },

  // === LOGGING & MONITORING ===
  logs: {
    workspaceLogs: 'Työtilan audit lokit',
    connectionLogs: 'Yhteyden audit lokit',
    repositoryLogs: 'Data-arkiston audit lokit',
    userAuditLogs: 'Käyttäjän audit lokit',
    workflowLogs: 'Prosessin audit lokit',
    noLogsFound: 'Ei lokeja löytynyt',
    system: 'Järjestelmä',
    foundLogEvents: 'Lokitapahtumia löytyi',
    storedQueryLogs: 'Kyselyn audit lokit',
    policyLogs: 'Käyttöoikeuden audit lokit',
    repositoryObjectLogs: 'Data-arkiston objektin audit lokit',
    waitingForLogs: 'Odotetaan lokeja...',
    waitingForResults: 'Odotetaan tuloksia...',
  },

  // === DOCUMENTATION ===
  documentation: {
    documentation: 'Dokumentaatio',
    workspaceDocumentation: 'Työtilan dokumentaatio',
    downloadPdf: 'Lataa PDF',
    startTypingDocumentation:
      'Aloita dokumentaation ja muistiinpanojen kirjoittaminen...',
    schema: 'Skeema',
    workspace: 'Työtila',
    createdBy: 'Luonut',
    searchPlaceholder: 'Hae dokumentaatiosta...',
    summaryTitle: 'Työtilan yhteenveto',
    summaryDescription:
      'Yhteenveto tämän työtilan data-arkistoista, yhteyksistä ja työnkuluista.',
    workspaceIdentifier: 'Työtilan tunniste',
    repositorySectionDescription:
      'Omistajatiedot, tunnisteet ja arkistojen dokumentaatio.',
    repositorySearchEmptyTitle: 'Yhtään arkistoa ei löydy haulla',
    repositorySearchEmptyDescription:
      'Säädä hakuehtoja nähdäksesi arkistojen dokumentaation.',
    clearSearch: 'Tyhjennä haku',
    visibilityLabel: 'Näkyvyys',
    visibilityPrivate: 'Yksityinen',
    notesHeading: 'Muistiinpanot',
    connectionSectionDescription:
      'Yhteyden omistajatiedot, liittimen tyyppi ja dokumentaatio.',
    connectionSearchEmptyTitle: 'Yhtään yhteyttä ei löydy haulla',
    connectionSearchEmptyDescription:
      'Säädä hakuehtoja nähdäksesi yhteyksien dokumentaation.',
    workflowSectionDescription:
      'Työnkulkujen omistajat, tilat, tunnisteet ja liittyvät resurssit.',
    workflowSearchEmptyTitle: 'Yhtään työnkulkua ei löydy haulla',
    workflowSearchEmptyDescription:
      'Säädä hakuehtoja nähdäksesi työnkulkujen dokumentaation.',
    scriptSectionDescription:
      'Suoritettavat skriptit datankäsittelyyn ja automaatioon.',
    scriptSearchEmptyTitle: 'Yhtään skriptiä ei vastaa hakuasi',
    scriptSearchEmptyDescription:
      'Muuta hakutermiäsi nähdäksesi skriptien dokumentaatio.',
    querySectionDescription:
      'Tallennetut SQL-kyselyt data-analyysiin ja raportointiin.',
    querySearchEmptyTitle: 'Yhtään kyselyä ei vastaa hakuasi',
    querySearchEmptyDescription:
      'Muuta hakutermiäsi nähdäksesi kyselyiden dokumentaatio.',
    scheduleLabel: 'Aikataulu',
    workspaceEmptyTitle: 'Työtila on tyhjä',
    workspaceEmptyDescription:
      'Luo ensimmäinen arkisto, yhteys tai työnkulku dokumentaation muodostamiseksi.',
    goToWorkspace: 'Siirry työtilaan',
    schemaTitle: 'Työtilan kaavio',
    schemaIntro:
      'Visuaalinen näkymä työtilan yhteyksien, työnkulkujen ja arkistojen suhteista.',
    schemaSearchPlaceholder: 'Hae työnkulkuja tai komponentteja...',
    dataFlowsTitle: 'Tietovirrat',
    workflowRelationshipsEmptyDescription:
      'Säädä hakuehtoja nähdäksesi työnkulkujen suhteet.',
    componentDirectoryTitle: 'Komponenttihakemisto',
    directoryRepositoriesEmpty: 'Arkistoja ei ole määritetty.',
    directoryConnectionsEmpty: 'Yhteyksiä ei ole määritetty.',
    referencedBy: 'Käytössä',
    unknownConnector: 'Tuntematon liitin',
    branches: 'Haarat',
    gitTags: 'Git-tagit',
    defaultBranch: 'Oletushaara',
    schemaObjects: 'Skeemaobjektit',
    expandDetails: 'Näytä tiedot',
    collapseDetails: 'Piilota tiedot',
    noBranches: 'Haaroja ei löytynyt.',
    noGitTags: 'Git-tageja ei löytynyt.',
    noObjects: 'Objekteja ei löytynyt.',
    loadingDetails: 'Ladataan tietoja...',
    andMoreObjects: 'ja {count} lisää...',
    relatedWorkflows: 'Liittyvät työnkulut',
  },

  // === LIST COMPONENTS ===
  list: {
    status: 'Tila',
    runs: 'Ajot',
    viewAll: 'Näytä kaikki',
    lastUpdated: 'Päivitetty',
    createdAt: 'Luotu',
    immutable: 'Muuttumaton',
    searchPlaceholder: 'Kirjoita hakusana...',
    noItemsFound: 'Ei kohteita',
    noItems: 'Ei kohteita',
    emptyState: {
      repositories: {
        title: 'Ei vielä repositorioita',
        description:
          'Repositoriot tallentavat datasi Git-tyylisessä rakenteessa. Luo ensimmäinen repositorio aloittaaksesi.',
      },
      workflows: {
        title: 'Ei vielä työnkulkuja',
        description:
          'Työnkulut automatisoivat data-tehtäviäsi. Luo tuonti-, vienti-, toiminto- tai putki-työnkulkuja aloittaaksesi.',
      },
      workflowRunsForWorkflow: {
        title: 'Tämä prosessi ei ole vielä suoritettu',
        description:
          'Aloita käynnistämällä prosessin ajo tai odota, kunnes se on laukautunut aikataulun mukaan.',
      },
      allWorkflowRuns: {
        title: 'Ei vielä prosessin ajoja',
        description:
          'Prosessin ajot näkyvät täällä kun prosesseja suoritetaan. Käynnistä prosessin ajo tai odota aikataulutettujen prosessien ajamista.',
      },
      connections: {
        title: 'Ei vielä yhteyksiä',
        description:
          'Yhteydet mahdollistavat tuonnin ja viennin ulkoisista tietolähteistä. Luo ensimmäinen yhteys aloittaaksesi.',
      },
      invites: {
        title: 'Ei odottavia kutsuja',
        description:
          'Kun kutsut ihmisiä tähän työtilaan, he näkyvät täällä kunnes hyväksyvät tai hylkäävät kutsun.',
      },
      queries: {
        title: 'Ei tallennettuja kyselyjä',
        description:
          'Aloita kirjoittamalla SQL-kysely editorissa ja tallenna se tulevaa käyttöä varten.',
      },
      tokens: {
        title: 'Ei API-tunnuksia',
        description:
          'API-tunnukset mahdollistavat ohjelmoitavan autentikoinnin Irmin API:n kanssa. Luo ensimmäinen tunnus aloittaaksesi.',
      },
      scripts: {
        title: 'Ei vielä skriptejä',
        description: 'Luo ensimmäinen skripti aloittaaksesi.',
      },
      aiApplications: {
        title: 'Ei vielä AI-sovelluksia',
        description:
          'AI-sovellukset mahdollistavat datasi jakamisen tekoälytyökalujen ja -avustajien kanssa. Luo ensimmäinen AI-sovellus aloittaaksesi.',
      },
      generic: {
        title: 'Kohteita ei löytynyt',
        description:
          'Yritä muuttaa hakuehtojasi tai suodattimiasi löytääksesi etsimäsi.',
      },
    },
  },

  // === UTILITIES ===
  schemaFieldMapper: {
    title: 'Kenttien yhdistäminen',
    description:
      'Klikkaa lähdekenttää, sitten kohdekenttää luodaksesi yhdistämisen',
    descriptionWithSelection:
      'Klikkaa kohdekenttää yhdistääksesi "{fieldName}" lähteestä {source}',
    sourceSchema: 'Lähderakenne',
    destinationSchema: 'Kohderakenne',
    fieldMappings: 'Kenttien yhdistämiset',
    noMappingsYet: 'Ei vielä yhdistämisiä',
    autoMapIdenticalFields: 'Yhdistä samat kentät automaattisesti',
    clearAllMappings: 'Tyhjennä kaikki yhdistämiset',
    fields: 'kenttää',
    mapped: 'yhdistetty',
    required: 'pakollinen',
    fileSize: '{size}KB',
    autoMappedSuccess: 'Yhdistetty {count} samaa kenttää automaattisesti!',
    noIdenticalFieldsFound: 'Ei samankaltaisia kenttiä yhdistettäväksi.',
    sourceEmpty: 'Lähde on tyhjä - ei kenttiä yhdistettäväksi',
    destinationEmpty: 'Kohde on tyhjä - mitään ei tarvitse korvata',
    noFieldsToMap:
      'Kenttien yhdistäminen ei ole käytettävissä, koska toisella tai molemmilla puolilla ei ole ennalta määriteltyjä kenttiä. Kentät luodaan automaattisesti työnkulkua suoritettaessa.',
    jsonPathPlaceholder: 'JSON-polku purkamiseen (esim. data)',
    noCastType: 'Ei tyyppimuunnosta',
    unwrapLabel: 'pura',
    fieldMappingStageDescription:
      'Käytä kenttien yhdistämistä nimien muuttamiseen, tyyppien vaihtamiseen tai rakenteen muuttamiseen',
    addFieldPlaceholder: 'Kentän nimi...',
    nestedFieldsTruncated: 'Syvempiä sisäkkäisiä kenttiä ei näytetä',
  },

  dataSizeWarning: {
    // Titles
    tableTooLarge: 'Taulukko liian suuri',
    jsonTooLarge: 'JSON liian suuri',
    fileTooLarge: 'Tiedosto liian suuri',
    largeTableWarning: 'Suuren taulukon varoitus',
    largeJsonWarning: 'Suuren JSON:n varoitus',
    largeFileWarning: 'Suuren tiedoston varoitus',

    // Messages - Errors
    tableTooLargeMessage:
      'Tämä taulukko on liian suuri renderöitäväksi turvallisesti selaimessasi. Lataa se CSV-muodossa sen sijaan.',
    jsonTooLargeMessage:
      'Tämä JSON-objekti on liian suuri renderöitäväksi turvallisesti selaimessasi. Lataa se sen sijaan.',
    fileTooLargeMessage:
      'Tämä tiedosto on liian suuri näytettäväksi selaimessasi. Lataa se sen sijaan.',

    // Messages - Warnings
    largeTableMessage:
      'Tämä taulukko on suuri ja saattaa aiheuttaa suorituskykyongelmia. Voit ladata sen tai yrittää renderöidä sen joka tapauksessa.',
    largeJsonMessage:
      'Tämä JSON-objekti on suuri ja saattaa aiheuttaa suorituskykyongelmia. Voit ladata sen tai yrittää renderöidä sen joka tapauksessa.',
    largeFileMessage:
      'Tämä tiedosto on suuri ja sen lataaminen saattaa kestää jonkin aikaa.',

    // Actions
    renderAnyway: 'Renderöi joka tapauksessa',
    downloadCsv: 'Lataa CSV',

    // Additional info
    sizeLabel: 'Koko:',
    performanceWarning:
      'Suurten tietojen renderöinti saattaa hidastaa selainta tai aiheuttaa sen jumittumisen.',
  },

  // === SCHEMA BUILDER ===
  schemaBuilder: {
    builder: 'Rakentaja',
    rawJson: 'Raaka JSON',
    invalidJson: 'Virheellinen JSON',
    type: 'Tyyppi',
    name: 'Nimi',
    path: 'Polku',
    contentType: 'Sisältötyyppi',
    size: 'Koko',
    metadata: 'Metatiedot',
    restrictions: 'Rajoitukset',
    properties: 'Ominaisuudet',
    addProperty: 'Lisää ominaisuus',
    constraints: 'Rajoitteet',
    required: 'Pakollinen',
    format: 'Muoto',
    enum: 'Enum-arvot',
    enumPlaceholder: 'Syötä arvot pilkuilla erotettuna',
    pattern: 'Kuvio (Regex)',
    minLength: 'Minimipituus',
    maxLength: 'Maksimipituus',
    minimum: 'Minimi',
    maximum: 'Maksimi',
    minItems: 'Minimimäärä',
    maxItems: 'Maksimimäärä',
    default: 'Oletusarvo',
    items: 'Taulukon alkiot',
    noStructured: 'Ei strukturoituja lapsia',
    noBinary: 'Ei binäärilapsia',
    noGroups: 'Ei ryhmälapsia',
    onlyStructured: 'Vain strukturoituja lapsia',
    onlyBinary: 'Vain binäärilapsia',
    onlyGroups: 'Vain ryhmälapsia',
    allowedContentTypes: 'Sallitut sisältötyypit',
    restrictedContentTypes: 'Kielletyt sisältötyypit',
    maxSize: 'Maksimikoko (tavua)',
    minSize: 'Minimikoko (tavua)',
    maxCount: 'Maksimimäärä',
    minCount: 'Minimimäärä',
    namePattern: 'Nimikuvio (Regex)',
    types: {
      string: 'Merkkijono',
      number: 'Numero',
      integer: 'Kokonaisluku',
      boolean: 'Totuusarvo',
      object: 'Objekti',
      array: 'Taulukko',
      null: 'Null',
    },
    formats: {
      email: 'Sähköposti',
      uri: 'URI',
      date: 'Päivämäärä',
      'date-time': 'Päivämäärä ja aika',
      time: 'Aika',
      uuid: 'UUID',
      hostname: 'Isäntänimi',
      ipv4: 'IPv4',
      ipv6: 'IPv6',
    },
    errors: {
      invalidRegex: 'Virheellinen säännöllinen lauseke',
      nameRequired: 'Ominaisuuden nimi on pakollinen',
    },
  },
};

export default fi;
