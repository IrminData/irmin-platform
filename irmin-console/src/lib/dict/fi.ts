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
    upload: 'Lataa',
    download: 'Lataa',
    back: 'Takaisin',
    next: 'Seuraava',
    previous: 'Edellinen',
    continue: 'Jatka',
    close: 'Sulje',
    open: 'Avaa',
    refresh: 'Päivitä',
    tryAgain: 'Yritä uudelleen',
    comingSoon: 'Tulossa pian!',

    // Error display
    pageNotFoundDescription:
      'Sivua, jota etsitään, ei ole saatavilla tai on siirretty.',
    errorDetails: 'Virheen tiedot',
    reportIssue: 'Ilmoita virheestä',
    showDetails: 'Näytä lisätiedot',
    hideDetails: 'Piilota lisätiedot',
    copy: 'Kopioi',
    copied: 'Kopioitu',
    stackTrace: 'Virheen seuranta',

    // Search and navigation
    search: 'Hae',
    filters: 'Suodattimet',
    noResults: 'Ei tuloksia',
    loadMore: 'Lataa lisää',
    selectAll: 'Valitse kaikki',

    // Status and feedback
    success: 'Onnistui',
    error: 'Virhe',
    info: 'Info',
    yes: 'Kyllä',
    no: 'Ei',
    optional: 'Valinnainen',

    // Content
    name: 'Nimi',
    description: 'Kuvaus',
    email: 'Sähköposti',
    message: 'Viesti',
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
    messagePlaceholder: 'Kirjoita viestisi tähän...',

    // Messages and alerts
    insufficientPermissions: 'Liian vähän oikeuksia',
    ohNo: 'Voi ei!',
    pageNotFound: 'Sivua ei löytynyt',
    somethingWentWrong: 'Jotain meni pieleen',
    weEncounteredError: 'Kohtasimme virheen',
    tryAgainOrContactSupport: 'Yritä uudelleen tai ota yhteyttä tukeen',
    goBackHome: 'Mene takaisin kotisivulle',
    goBackConsole: 'Palaa Irmin-konsoliin',
    noOptionsMessage: 'Ei vaihtoehtoja',
    downloadSuccess: 'Lataus onnistui',
    dangerZone: 'Vaaravyöhyke',

    // Confirmations
    areYouSureYouWantToDelete:
      'Oletko varma, että haluat poistaa tämän kohteen?',
    areYouSureYouWantToTransferOwnership:
      'Oletko varma, että haluat vaihtaa tämän kohteen omistajan?',
    deleteConfirmation: 'Oletko varma, että haluat poistaa',
    saved: 'Tallennettu onnistuneesti',
    deleted: 'Poistettu onnistuneesti',
    saveChanges: 'Tallenna muutokset',

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
    workspaceSettings: 'Työtila',
    goToWebsite: 'Siirry verkkosivustolle',
    myProfile: 'Profiilini',
    signOut: 'Kirjaudu ulos',
    guides: 'Oppaat',
    contactSupport: 'Ota yhteyttä tukeen',
    developerDocs: 'Dokumentaatio kehittäjille',
    termsAndPrivacy: 'Käyttöehdot ja tietosuoja',

    staticSearchItems: {
      guides: 'Irmin Oppaat',
      documentation: 'Irmin Dokumentaatio',
      termsAndPrivacy: 'Käyttöehdot & Tietosuojakäytäntö',
      createWorkspace: 'Luo uusi työtila',
      workspaceDocumentation: 'Työtilan Dokumentaatio',
      myProfile: 'Oma Profiili',
      manageWorkspaces: 'Hallitse Työtiloja',
      scripts: 'Skriptit',
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
      },
    },
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
    generalSettings: 'Yleiset asetukset',
    workspaceName: 'Työtilan nimi',
    workspaceDescription: 'Työtilan kuvaus',
    noWorkspaceDescription: 'Ei työtilan kuvausta',
    saveChanges: 'Tallenna muutokset',
    deletionNote:
      'Työtilan poistaminen poistaa kaiken siihen liittyvän datan. Tätä toimintoa ei voi peruuttaa.',
    deleteWorkspace: 'Poista työtila',
    billingSettings: 'Laskutuksen asetukset',
    billingNote:
      'Voit tällä hetkellä hallita laskutusta vain ottamalla yhteyttä tiimiimme.',
    addTags: 'Lisää tunnisteet',
    failedToLoadTags: 'Tunnisteiden lataaminen epäonnistui',
    failedToLoadWorkspaces: 'Työtilojen lataaminen epäonnistui',
    member: 'jäsen',
    members: 'jäseniä',
    noMembersYet: 'Ei jäseniä vielä',
  },

  workspaceSwitcher: {
    manageWorkspaces: 'Hallinnoi työtiloja',
    selectWorkspace: 'Valitse työtila',
    createNewWorkspace: 'Luo uusi työtila',
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
    branches: {
      branches: 'Haarat',
      currentBranch: 'Nykyinen',
      branch: 'Haara',
      ref: 'Ref',
      createBranch: 'Luo haara',
      primary: 'Päähaara',
      primaryBranch: 'Päähaara',
      newBranchName: 'Uuden haaran nimi',
      fromBranch: 'Haarasta',
      confirmDeleteBranch: 'Oletko varma, että haluat poistaa tämän haaran?',
    },
    tags: {
      tag: 'Tagi',
      tags: 'Tagit',
      tagDescription: 'Tagi on immuuttinen viittaus tiettyyn commit-tilaan.',
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
    },
    compare: {
      compare: 'Vertaa',
      switchDirection: 'Vaihda suuntaa',
      baseBranch: 'Pohjahaara',
      compareBranch: 'Vertailuhaara',
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
      defaultStrategy: 'Oletus',
      destWinsStrategy: 'Kohde voittaa',
      sourceWinsStrategy: 'Lähde voittaa',
      mergeExplanation:
        'Jos sulauttamisessa esiintyy konflikti, tämä asetus suosii automaattisesti pohjan ("Kohde voittaa") tai vertailun ("Lähde voittaa") muutoksia. Ellei mitään valintaa tehdä, sulautus epäonnistuu konfliktitilanteessa.',
    },
    objects: {
      object: 'Objekti',
      objects: 'Objektit',
      noObjects: 'Ei objekteja',
      noObjectsMessage:
        'Aloita lataamalla tiedostoja tai luomalla tuontiprosessin',
      uploadObject: 'Lataa objekti',
      path: 'Polku',
      currentPath: 'Nykyinen polku',
      currentName: 'Nykyinen nimi',
      type: 'Tyyppi',
      contentType: 'Sisältötyyppi',
      view: 'Näytä',
      unsupportedContentType: 'Sisältötyyppiä ei tueta',
      contentUnavailable: 'Objektin sisältö ei ole saatavilla',
      viewSchema: 'Näytä rakenne',
      filterObjects: 'Suodata objekteja',
      uploadAndReplace: 'Lataa ja korvaa',
      moveOrRename: 'Siirrä tai nimeä uudelleen',
      changeHistory: 'Muutoshistoria',
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
    connectionTestSuccess: 'Yhteys validoitu onnistuneesti',
    settings: {
      title: 'Yhteyden asetukset',
      saveChanges: 'Tallenna muutokset',
      deletionNote:
        'Poistamalla tämän yhteyden poistetaan kaikki siihen liittyvä data. Tätä toimintoa ei voi peruuttaa.',
      delete: 'Poista yhteys',
      areYouSureYouWantToDelete:
        'Oletko varma, että haluat poistaa tämän yhteyden?',
    },
    create: {
      selectConnector: 'Valitse yhdistin',
      establishConnection: 'Perusta yhteys',
      configureSettings: 'Määritä asetukset',
      configureConnection: 'Määritä yhteys',
      createNewConnection: 'Luo uusi yhteys',
      pleaseSelectConnector: 'Valitse yhdistin jatkaaksesi',
      confirmConnectorSelection: 'Vahvista yhdistimen valinta ja jatka',
      selectedConnector: 'Valittu yhdistin',
      categoryAll: 'Kaikki',
      connectionName: 'Yhteyden nimi',
      connectionNamePlaceholder: 'esim. Minun Google Analytics -yhteys',
      connectionDescription: 'Yhteyden kuvaus',
      connectionDescriptionPlaceholder:
        'Kirjoita kuvaus yhteydelle, jotta muut tietävät, mihin sitä käytetään',
      addCustomConnector: 'Lisää oma yhdistin',
      continueAndTest: 'Jatka ja testaa yhteys',
      createConnection: 'Luo yhteys',
      continue: 'Jatka',
      goBack: 'Mene takaisin',
      success: 'Yhteys onnistui',
      failed: 'Yhteys epäonnistui',
      configuration_valid: 'Yhteyden konfiguraatio on validi',
      configuration_invalid: 'Yhteyden konfiguraatio on virheellinen',
      contactSupport: 'Ota yhteyttä tukeen',
      requiredFieldsMissing: 'Pakollisia kenttiä puuttuu',
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
      updateSuccess: 'Yhteys päivitettiin onnistuneesti',
      updateFailed: 'Yhteyden päivitys epäonnistui. Tarkista virheet.',
    },
  },

  connectors: {
    connector: 'Yhdistin',
    connectors: 'Yhdistimet',
    version: 'Versio',
    author: 'Tekijä',
    authorEmail: 'Tekijän sähköposti',
    categories: 'Kategoriat',
    capabilities: 'Toiminallisuudet',
    locales: 'Kielet',
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
    triggeringRun: 'Käynnistetään ajoa',
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
    openInEditor: 'Avaa editorissa',
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
    triggeredBy: 'Laukaisija',
    duration: 'Kesto',
    // New translations for MultiplePathsSelector
    addPath: 'Lisää polku',
    removePath: 'Poista polku',
    multiplePaths: 'Useita polkuja',
    tabs: {
      data: 'Data',
      schedule: 'Aikataulu',
    },
    settings: {
      saveChanges: 'Tallenna muutokset',
      deletionNote:
        'Poistamalla tämän prosessin poistetaan kaikki siihen liittyvä data. Tätä toimintoa ei voi peruuttaa.',
      delete: 'Poista prosessi',
      areYouSureYouWantToDelete:
        'Oletko varma, että haluat poistaa tämän prosessin?',
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
      },
    },
    pipeline: {
      pipeline: 'Dataputki',
      addNewStage: 'Lisää uusi vaihe',
      addStage: 'Lisää vaihe',
      stage: 'Vaihe',
      descriptionPlaceholder: 'Kuvaile, mitä tämä dataputken vaihe tekee',
      write: 'Kirjoita',
      read: 'Lue',
      executablePath: 'Suoritettava polku',
      executablePathDescription:
        'Polku suoritettavaan skriptiin (esim. /path/to/script.py)',
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
      stageTypeDescription: {
        action:
          'Toimintovaiheet suorittavat mukautettuja skriptejä datan käsittelyyn, vastaanottaen syötettä edellisistä vaiheista ja tuottaen tulosta seuraaville vaiheille.',
        connection:
          'Yhteyden vaiheet vuorovaikuttavat ulkoisten tietolähteiden kanssa, lukien tai kirjoittaen yhteyksiin kuten tietokantoihin, API:hin tai tiedostojärjestelmiin.',
        repository:
          'Arkiston vaiheet lukevat tai kirjoittavat Irmin-arkistoihin, mahdollistaen datan versionhallinnan ja tallennuksen prosessin työnkulussa.',
      },
    },
    schedule: {
      workflowSchedule: 'Prosessin aikataulu',
      frequency: 'Usein toistuva?',
      interval: 'Väli',
      weekdays: 'Viikonpäivät',
      trigger: 'Laukaisin',
      triggers: 'Laukaisimet',
      timeTrigger: 'Aikapohjainen laukaisin',
      repositoryEventTrigger: 'Data-arkiston tapahtumalaukaisin',
      workflowRunEventTrigger: 'Prosessin ajotapahtuma-laukaisin',
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
      triggerDetails: 'Laukaisimen tiedot',
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
    scripts: 'Skriptit',
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
    noErrors: 'Ei virheitä',
    queryResults: 'Kyselyn tulokset',
    createQuery: 'Luo kysely',
    saveQuery: 'Tallenna kysely',
    saveAsWorkflow: 'Tallenna prosessina',
    run: 'Suorita',
    rowsReturnedIn: 'riviä palautettu ajassa',
    exportTable: 'vie taulukko (.csv)',
    search: 'Hae tuloksista',
    newQuery: 'Uusi kysely',
    selectedQuery: 'Valittu kysely',
    editor: 'SQL-editori',
    syntaxHelper: 'Syntaksiavustaja',
    queryNotFound: 'Kyselyä ei löytynyt',
    queryDeleted: 'Kyselyä ei ole enää saatavilla',
    searchQueries: 'Hae kyselyjä...',
    failedToCreateQuery: 'Kyselyn luominen epäonnistui',
    failedToUpdateQuery: 'Kyselyn päivitys epäonnistui',
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
    placeholderRecommended:
      'Paikkamerkit ovat siirrettäviä ja tarjoavat paremman selkeyden.',
    placeholderSyntaxNote:
      'Ref (haara/commit) on valinnainen. Työtila on valinnainen, jos ajetaan samassa työtilassa.',
    alternativeS3Syntax: 'Vaihtoehto: Natiivi DuckDB S3 -syntaksi',
    alternativeS3Description:
      'Edistyneissä käyttötapauksissa voit myös käyttää natiiveja DuckDB-funktioita suorilla S3-poluilla.',
    s3FormatNote: 'S3-muoto: s3://työtila-arkisto/haara/polku',
    alternativeS3Example: 'Natiivi DuckDB S3 -syntaksi (Vaihtoehto)',
    alternativeS3ExampleExplanation:
      'Käytä natiiveja DuckDB-funktioita S3-poluilla edistyneissä käyttötapauksissa. Molemmat syntaksit pakottavat samat käyttöoikeudet.',
    basicSyntax: 'Perussyntaksi',
    examples: 'Kyselyesimerkit',
    basicQueries: 'Peruskyselyt',
    advancedAnalytics: 'Kehittynyt analytiikka',
    jsonOperations: 'JSON-operaatiot',
    crossRepoAndBranch: 'Repositorioiden ja haarojen välillä',
    queryDocumentationTab: 'SQL-syntaksi',
    generateSql: 'Generoi SQL',
    sqlSelector: 'SQL valitsin',
    copySelector: 'Kopioi valitsin',
    copy: 'Kopioi',
    close: 'Sulje',
    noSchemaAvailable: 'Ei rakennetta saatavilla nykyisessä kontekstissa.',
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
    },
    sqlGeneration: {
      title: 'Luo SQL-kysely',
      placeholder: 'Kuvaile mitä haluat kysellä...',
      send: 'Lähetä',
      generatedSql: 'Luotu SQL',
      copySql: 'Kopioi SQL',
      copyText: 'Kopioi',
      response: 'Vastaus',
      clearChat: 'Tyhjennä',
      loading: 'Luodaan SQL:ää...',
      error: 'SQL:n luominen epäonnistui',
      noMessages: 'Aloita keskustelu luodaksesi SQL-kyselyitä',
    },
  },

  fileNavigator: {
    original: 'Alkuperäinen',
    saveFile: 'Tallenna tiedosto',
    createFile: 'Luo tiedosto',
    createFolder: 'Luo kansio',
    updateFile: 'Päivitä tiedosto',
    updateFolder: 'Päivitä kansio',
    copyFolder: 'Kopioi kansio',
    copyFile: 'Kopioi tiedosto',
    open: 'Avaa',
    rename: 'Nimeä uudelleen',
    move: 'Siirrä',
    root: 'Juuri',
    rootDirectory: 'Juurihakemisto',
    newNameOfTheFile: 'Tiedoston uusi nimi',
    newNameOfTheFolder: 'Kansion uusi nimi',
    newPathOfTheFile: 'Tiedoston uusi polku',
    newPathOfTheFolder: 'Kansion uusi polku',
    newFileName: 'Uuden tiedoston nimi',
    newFolderName: 'Uuden kansion nimi',
    newFilePath: 'Uuden tiedoston polku',
    newFolderPath: 'Uuden kansion polku',
    deleteConfirmation: 'Oletko varma, että haluat poistaa',
    deleteFolderWarning:
      'Kaikki tämän kansion tiedostot ja alikansiot poistetaan',

    errors: {
      invalidType: 'Virheellinen tyyppi (tiedosto tai kansio)',
      noExtension: 'Tiedoston pääte puuttuu tai on virheellinen',
      invalidExtension: 'Virheellinen tiedostopääte (js, py, sql)',
      emptyName: 'Nimi ei voi olla tyhjä',
      longName: 'Nimi on liian pitkä',
      invalidName: 'Virheellinen nimi',
      invalidPath: 'Virheellinen polku',
      pathExists: 'Polku on jo olemassa',
      parentPathNotExist: 'Yläkansiota ei ole olemassa',
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
    dataExportWizardComingSoon: 'Datan vientiohjattu tulee pian!',

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
    failedToCreateRepository: 'Data-arkiston luominen epäonnistui',
    pleaseSelectRepository: 'Valitse data-arkisto',
    createNewRepositoryDescription: 'Luo uusi data-arkisto datallesi',
    noRepositoriesFound: 'Data-arkistoja ei löytynyt hakuasi vastaavasti.',
    noRepositoriesAvailable: 'Ei data-arkistoja saatavilla.',

    // Configure Import Step
    pleaseSpecifyImportPath: 'Määritä vähintään yksi tuontipolku',
    failedToConfigureImport: 'Tuontiasetusten määrittäminen epäonnistui',
    importDestinationPath: 'Tuonnin kohdepolku',

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
    pleaseEnterWorkflowDescription: 'Anna prosessin kuvaus',
    pleaseSelectRepositoryBranch: 'Valitse data-arkiston haara',
    pleaseSelectRepositoryPaths: 'Valitse data-arkiston polut',
    pleaseSelectConnectionPath: 'Valitse yhteyden polku',
    workflowNamePlaceholder: 'Anna prosessin nimi',
    workflowDescriptionPlaceholder: 'Anna prosessin kuvaus',
    workflowDocumentationPlaceholder: 'Anna prosessin dokumentaatio',
    repositoryBranchPlaceholder: 'Anna data-arkiston haara',
    selectRepositoryPaths: 'Valitse data-arkiston polut',
    selectConnectionPath: 'Valitse yhteyden polku',
    workflowDocumentation: 'Prosessin dokumentaatio',
    connection: 'Yhteys',
    repository: 'Data-arkisto',
    description: 'Kuvaus',
    documentation: 'Dokumentaatio',
  },

  // === ASSISTANT ===
  assistant: {
    // Assistant Section
    title: 'Avustaja',
    conversations: 'Keskustelut',
    noConversationSelected: 'Ei keskustelua valittuna',
    noConversationSelectedDescription:
      'Valitse olemassa oleva keskustelu sivupalkista tai luo uusi aloittaaksesi keskustelun tekoälyavustajan kanssa.',
    noMessagesInTheConversation: 'Keskustelussa ei ole viestejä',
    noMessagesInTheConversationDescription:
      'Tässä keskustelussa ei ole viestejä. Aloita lähettämällä viesti avustajan kanssa.',
    assistantInterfaceError: 'Avustajakäyttöliittymän virhe',
    failedToLoadAssistantInterface:
      'Avustajakäyttöliittymän lataaminen epäonnistui',
    openSidebar: 'Avaa sivupalkki',
    openInFullPage: 'Avaa täysikokoisessa sivussa',
    contextAwareBanner:
      'Olen tietoinen kontekstista! Näen millä sivulla olet, avoimet tiedostosi ja valitut objektit.',

    // Conversations List
    newConversation: 'Uusi keskustelu',
    noConversations: 'Ei vielä keskusteluja',

    // Conversation Details
    created: 'Luotu',
    lastUpdated: 'Viimeksi päivitetty',
    lastMessage: 'Viimeisin viesti',
    totalMessages: 'Viestit yhteensä',
    userMessages: 'Käyttäjän viestit',
    assistantMessages: 'Avustajan viestit',
    estimatedTokens: 'Arvioitu määrä tokeneita',
    openConversation: 'Avaa keskustelu',
    deleteConversation: 'Poista keskustelu',
    clearConversation: 'Tyhjennä keskustelu',

    // Assistant Chat
    askMeAnything:
      'Kysy minulta mitä tahansa - ohjelmointia, liiketoimintaa, kirjoittamista tai yleisiä kysymyksiä...',
    toggleWebSearch: 'Vaihda verkkohakusimulaatiota',
    search: 'Hae',

    // Chat Suggestions
    querySyntaxExamples: 'Näytä esimerkki SQL kyselystä',
    whatIsIrmin: 'Mikä Irmin on?',
    whatRepositoriesDoIHave: 'Mitkä data-arkistot minulla on?',
    whatConnectionsAndWorkflowsDoIHave:
      'Mitkä yhteydet ja työnkulut minulla on?',

    // Chat Elements
    webSearchResult: 'Verkkohakutulos',
    tool: 'Työkalu',
    back: 'Takaisin',
    forward: 'Eteenpäin',
    thisIsDetailedExplanation:
      'Tämä on yksityiskohtainen selitys {approach} lähestymistavasta.',

    // Message Actions
    copyMessage: 'Kopioi viesti',
    messageCopied: 'Viesti kopioitu leikepöydälle',
    copyFailed: 'Viestin kopiointi epäonnistui',

    // Tool and Reasoning Elements
    toolCalls: 'Työkalukutsut',
    thinkingSteps: 'Ajatteluvaiheet',
    iteration: 'Iteraatio',
    iterations: 'iteraatiota',
    systemMessage: 'Järjestelmäviesti',
    streamCompleted: 'Virta valmis',
    error: 'Virhe',
    likeThisResponse: 'Tykkää tästä vastauksesta',
    dislikeThisResponse: 'Älä tykkää tästä vastauksesta',
    thisResponseWasGeneratedThrough: 'Tämä vastaus luotiin',
    ofReasoningAndToolUsage: 'ajattelun ja työkalujen avulla',
  },

  // === USER MANAGEMENT ===
  users: {
    removeUserConfirmation:
      'Oletko varma, että haluat poistaa tämän käyttäjän?',
    transferOwnershipConfirmation:
      'Oletko varma, että haluat siirtää omistajuuden?',
    usersAndPermissions: 'Käyttäjät ja oikeudet',
    invites: 'Kutsut työtilaan',
    inviteUser: 'Kutsu käyttäjä',
    changeProfilePicture: 'Vaihda profiilikuva',
    firstName: 'Etunimi',
    lastName: 'Sukunimi',
    email: 'Sähköposti',
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
  },

  tokens: {
    apiTokens: 'API avaimet',
    noTokens: 'Sinulla ei ole vielä luotuja API avaimia',
    createAPIToken: 'Luo API avain',
    validFor: 'Voimassa (sekunneissa)',
    expiresAt: 'Vanhenee',
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
  },

  policy: {
    title: 'Käyttöoikeudet',
    description: 'Hallitse käyttöoikeuksia ja käyttöoikeuksia',
    addPolicy: 'Lisää käyttöoikeus',
    createPolicy: 'Luo uusi käyttöoikeus',
    createPolicyDescription: 'Määritä uusi käyttöoikeus työtilallesi',
    editPolicy: 'Muokkaa käyttöoikeutta',
    editPolicyDescription: 'Muokkaa käyttöoikeuden asetuksia',
    deletePolicy: 'Poista käyttöoikeus',
    deletePolicyDescription:
      'Haluatko varmasti poistaa tämän käyttöoikeuden? Tätä toimintoa ei voi peruuttaa.',
    effect: 'Vaikutus',
    action: 'Toiminto',
    resource: 'Resurssi',
    principal: 'Kohde',
    resourceId: 'Resurssin tunniste (valinnainen)',
    resourceIdPlaceholder: 'Jätä tyhjäksi kaikille resursseille',
    loading: 'Ladataan käyttöoikeuksia...',
    error: 'Virhe käyttöoikeuksien lataamisessa',
    noPolicies: 'Ei käyttöoikeuksia',
    creating: 'Luodaan...',
    updating: 'Päivitetään...',
    deleting: 'Poistetaan...',
    effectAllow: 'Salli',
    effectDeny: 'Estä',
    actionRead: 'Lue',
    actionCreate: 'Luo',
    actionUpdate: 'Päivitä',
    actionDelete: 'Poista',
    principalWorkspaceUser: 'Käyttäjä',
    principalRole: 'Rooli',
    principalEveryone: 'Kaikki',
    allResources: 'Kaikki',

    tooltips: {
      effect: 'Onko käyttöoikeus eksplisiittisesti estävä vai salliva',
      action:
        'Mikä toiminto on sallittu tai estetty (luonti, lukeminen, päivitys, poisto)',
      resource: 'Resurssin tyyppi, jolle toiminto koskee',
      principal:
        'Kenelle käyttöoikeus koskee (tietty käyttäjä, rooli tai kaikki)',
      resourceId:
        'Valinnainen tietyn resurssin tunniste. Jätä tyhjäksi koskemaan kaikkia tämän tyyppisiä resursseja',
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
  },

  // === LIST COMPONENTS ===
  list: {
    status: 'Tila',
    runs: 'Ajot',
    actions: 'Toiminnot',
    view: 'Katso',
    viewAll: 'Näytä kaikki',
    delete: 'Poista',
    edit: 'Muokkaa',
    owner: 'Omistaja',
    author: 'Luoja',
    lastUpdated: 'Päivitetty',
    createdAt: 'Luotu',
    immutable: 'Muuttumaton',
    source: 'Lähde',
    destination: 'Kohde',
    searchPlaceholder: 'Kirjoita hakusana...',
    noItemsFound: 'Ei kohteita',
    tags: 'Tagit',
    search: 'Hae',
    loading: 'Ladataan...',
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
      users: {
        title: 'Ei vielä käyttäjiä',
        description: 'Kutsu tiimin jäseniä yhteistyöhön tässä työtilassa.',
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
      commits: {
        title: 'Ei vielä committeja',
        description:
          'Aloita tekemällä muutoksia repositorioosi nähdäksesi commitit täällä.',
      },
      tags: {
        title: 'Ei vielä tageja',
        description:
          'Tagit ovat muuttumattomia osoittimia tiettyihin committeihin. Luo tageja merkitäksesi tärkeitä versioita.',
      },
      branches: {
        title: 'Ei vielä haaroja',
        description:
          'Haarat mahdollistavat datasi eri versioiden käsittelyn samanaikaisesti.',
      },
      objects: {
        title: 'Ei vielä objekteja',
        description:
          'Aloita lataamalla tiedostoja tai luo työnkulku täyttääksesi tämän repositorion.',
      },
      scripts: {
        title: 'Ei vielä skriptejä',
        description: 'Luo ensimmäinen skripti aloittaaksesi.',
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
  },
};

export default fi;
