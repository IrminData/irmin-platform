import { Commit } from '@/types/core/Commit';

export const commits: () => Commit[] = () => [
  {
    hash: 'eea078b25044e62ae605a8ad72e7a8f84b16f51c911665cea1c3c67fac65e074',
    message: 'Initial commit of the project',
    timestamp: '2023-10-01T12:00:00Z',
    author: 'John Doe',
    previous_hash:
      '0f0b33a557e0359a6f26cc82ee6b83c48f0ac7b7a9c07fff37487445a8f40056',
  },
  {
    hash: '0f0b33a557e0359a6f26cc82ee6b83c48f0ac7b7a9c07fff37487445a8f40056',
    message: 'Added a new feature to the project',
    timestamp: '2023-10-02T14:30:00Z',
    author: 'Jane Smith',
    previous_hash:
      'cef3ffefb07f6e3e9f1171004e4330df975dc398d5169a85b208b9f17f50da7a',
  },
  {
    hash: 'cef3ffefb07f6e3e9f1171004e4330df975dc398d5169a85b208b9f17f50da7a',
    message: 'Fixed a bug in the project',
    timestamp: '2023-10-03T16:45:00Z',
    author: 'Alice Johnson',
    previous_hash:
      '85cb9fcfc9227d1f49f6935e418cb92f23f514338a132ee5a1856c0863c7cfca',
  },
  {
    hash: '85cb9fcfc9227d1f49f6935e418cb92f23f514338a132ee5a1856c0863c7cfca',
    message: 'Refactored the codebase for better performance',
    timestamp: '2023-10-04T10:20:00Z',
    author: 'Bob Brown',
    previous_hash:
      '87790dad5cae2da0965bb273c5dd280db4c10f12fbce4c6a342b8d4f4672a1e5',
  },
  {
    hash: '87790dad5cae2da0965bb273c5dd280db4c10f12fbce4c6a342b8d4f4672a1e5',
    message: 'Updated project documentation',
    timestamp: '2023-10-05T09:15:00Z',
    author: 'Carol White',
    previous_hash:
      'eee06730981ab5491b5e3587548b27c535ee1168c51d0c91988482e14d91cfe8',
  },
  {
    hash: 'eee06730981ab5491b5e3587548b27c535ee1168c51d0c91988482e14d91cfe8',
    message: 'Optimized code for better performance',
    timestamp: '2023-10-06T11:45:00Z',
    author: 'David Green',
    previous_hash:
      '03053df277a5ab5bc574c2b458954c0c0c930413e7964e51aa029059068713ce',
  },
  {
    hash: '03053df277a5ab5bc574c2b458954c0c0c930413e7964e51aa029059068713ce',
    message: 'Added unit tests for the project',
    timestamp: '2023-10-07T13:30:00Z',
    author: 'Eve Black',
    previous_hash:
      '69dc50dd8cc4a29045754308d34e109c2b69929c8d1d0393063594874370f513',
  },
  {
    hash: '69dc50dd8cc4a29045754308d34e109c2b69929c8d1d0393063594874370f513',
    message: 'Fixed a security vulnerability in the project',
    timestamp: '2023-10-08T15:00:00Z',
    author: 'Frank Blue',
    previous_hash: '',
  },
];
