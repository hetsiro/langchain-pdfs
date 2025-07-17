import Swal from 'sweetalert2';

export const showSuccessAlert = (message: string) => {
  Swal.fire({
    icon: 'success',
    title: '¡Éxito!',
    text: message,
    confirmButtonText: 'Aceptar',
    confirmButtonColor: '#36B37E',
  });
};

export const showErrorAlert = (message: string) => {
  Swal.fire({
    icon: 'error',
    title: 'Error',
    text: message,
    confirmButtonText: 'Aceptar',
    confirmButtonColor: '#EF4444',
  });
};

export const showInfoAlert = (message: string) => {
  Swal.fire({
    icon: 'info',
    title: 'Información',
    text: message,
    confirmButtonText: 'Aceptar',
    confirmButtonColor: '#6B7280',
  });
};