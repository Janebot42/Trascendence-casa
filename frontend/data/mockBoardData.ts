import { BoardColumn, User } from '@/types/board';

// Usuarios mock para asignaciones y avatares.
export const mockUsers: User[] = [
  {
    id: 'u1',
    name: 'Sarah Chen',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBn22a06oFCusUDWWIc52MsBV_04PB3EFRp8buzqs4cyjiy4UR5_rjn64Auvh8c972ia4qTZ5TYIp2nMrjBRq6MapsLQ8gyRtshJkCtwC5l06pkmMBrvjMwBTe26G931WFunZ_IZ4cYD_VIrED2PG9BdYXw5KSxFqE4yUT5vkcbxFZR3hhh9C1eioVAWXQmLjma3V8gnXMEOlwixhg3XFkNRxspePLDUelVKK-xek9SOIYvjJ8MmnU5JA',
  },
  {
    id: 'u2',
    name: 'Alex Rivera',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAxojU0_mJqf_Sa0IWYdbWZ9GURR9N6xCvPJDARo93DLIsZOPXoMOWWZe-VlwcFy1TLpOzVa8KNmx7P1yBcMq8U42rdMFQTkTECaA8xlSj7w87lmDCRoKZACu8WV4bE70k_xT3S9S6s1yqLANav5V1MDpeoIcMs_BCmFxrT5J0P2IGlRqqIFBFjdNjlJPXepVTqEEGlU1FveevRSah1TJDCOXeyjeQ1QCCkyOENlPL9l3o7-L4yUsu7Rw',
  },
  {
    id: 'u3',
    name: 'Marcus Vance',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDa4RMlMJQEI6-c-sjD-aJjmQfNsY74UxHgHIUiVabb844j_XuSz0we9icKSyyRyCCaj4p0mtEhgbbKNnWPP4Zt0lGx6qJl3um_Rl-0j4v6BIfdITQC7EY5o67MtRO6hGiGg6iPP4ixS99lPJxfztIYxDcVL23OaRX-lbd62H6OCTnCS2RSnLDsAXFEbaOcEP6wohEdSCY48xIvlixzausdcbEkB6b2ysUh3Tu7M7ahPUk5vuEKmfa-gw',
  },
  {
    id: 'u4',
    name: 'Elena Rostova',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA-4xqEMWbpnZMXliv0pibDvcxFNzQw4pO4l4r2OnbG9y99pIo0QlkKx6RJkVtdmLCXdq-A-dVLqwX8wShPbIKTB8peeFwUxjsvaY7rZwv2o7BlGPli-G7Dsp5Ohg15EGShRIN1RBzL8Uv1hGBAq6kDrUL3O_CD7CkK9rGVC1zKaMV8WEfYg6gOjKeKI-g4uagFgsrSoRrXPiXRiXvD2fH0eLqO9sowMQmu3PHwedAhxOqfmljuk9rIdQ',
  },
  {
    id: 'u5',
    name: 'David Kim',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCErcAVMM-HxM-UqP-c528J1ea2PGIZXeyrUnOE6PKPavjAxlSoMCAPlnht_seY8nJ6ONHeZrZIhhOm30mAJ7wHMuldTLanDNQE-q37rhGudjYrRgvKi292rv_YeupTlD0oKL5cMRSNu2QoY_Da6jcOVGsY6QqlGg8xVnqjCloc9IEF7rue2TqVMexSWghMqfHH1UhpEOiNR7iPiLmnwEm4VB1o_Iies0AUeHPZFSEk_w3Q9YBom5cuoQ',
  },
];

// Columnas iniciales del tablero con tareas precargadas.
export const initialColumns: BoardColumn[] = [
  {
    id: 'col-backlog',
    title: 'Backlog',
    tasks: [
      {
        id: 't-1',
        title: 'Audit existing site architecture',
        priority: 'Low',
        hasAttachment: true,
        checklist: { completed: 0, total: 4 },
        assignees: [mockUsers[3]],
      },
      {
        id: 't-2',
        title: "Draft new copy for 'About Us' page",
        priority: 'Medium',
        dueDate: 'Oct 12',
      },
      {
        id: 't-3',
        title: 'Explore WebGL header concepts',
        priority: 'Enhancement',
        commentsCount: 2,
        assignees: [mockUsers[4]],
      },
    ],
  },
  {
    id: 'col-todo',
    title: 'To Do',
    tasks: [
      {
        id: 't-4',
        title: 'Finalize color palette and typography tokens',
        priority: 'Urgent',
        dueDate: 'Oct 10',
        hasAttachment: true,
        assignees: [mockUsers[0]],
      },
      {
        id: 't-5',
        title: 'Create wireframes for homepage',
        priority: 'Medium',
        checklist: { completed: 2, total: 5 },
        assignees: [mockUsers[1]],
      },
    ],
  },
  {
    id: 'col-in-progress',
    title: 'In Progress',
    tasks: [
      {
        id: 't-6',
        title: 'Implement responsive navigation shell',
        priority: 'Urgent',
        hasAttachment: true,
        commentsCount: 4,
        hasWireframePreview: true,
        assignees: [mockUsers[1], mockUsers[2]],
      },
    ],
  },
  {
    id: 'col-done',
    title: 'Done',
    tasks: [
      {
        id: 't-7',
        title: 'Project Kickoff Meeting',
        priority: 'Medium',
        dueDate: 'Oct 1',
        completed: true,
      },
      {
        id: 't-8',
        title: 'Initial stakeholder interviews',
        priority: 'Medium',
        checklist: { completed: 3, total: 3 },
        assignees: [mockUsers[0]],
        completed: true,
      },
    ],
  },
];
