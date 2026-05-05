export const BASE_URL = 'https://teste-ptn4.onrender.com';

export const API_ROUTES = {
  LOGIN: '/login',

  USUARIO: {
    REGISTRAR: '/Usuario/registrar', 
    LISTAR: '/Usuario/lista_usuario',
    ATUALIZAR: (id: number) => `/Usuario/update/${id}`,
    UPDATE_SENHA: (id: number) => `/Usuario/update-senha/${id}`,
    DELETAR: (id: number) => `/Usuario/delet/${id}`,
  },

  CONSUMO: {
    CRIAR: '/consumo',
    LISTAR: '/lista_consumo',
    ATUALIZAR: (usuarioId: number) => `/update_consumo/${usuarioId}`,
    DELETAR: (id: number) => `/delet/${id}`,
  },

  METAS: {
    CRIAR: '/meta',
    LISTAR: '/lista_metas',
    ATUALIZAR: (usuarioId: number) => `/update_metas/${usuarioId}`,
    DELETAR: (id: number) => `/delete/${id}`,
  },

  SENHA: {
    RECUPERAR: '/recuperar-senha',
    RESETAR: '/resetar-senha',
  },

  GOOGLE: {
    LOGIN: '/login/google',
  },

  OCR: {
    UPLOAD: '/ocr',
    ANALISE: (id: number) => `/analise/${id}`,
    RESUMO: (usuarioId: number) => `/resumo/${usuarioId}`,
    CONVERTER: (idLeitura: number) => `/converter/${idLeitura}`,
  },
};

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 30000);

  try {
    const url = `${BASE_URL}${endpoint}`;
    console.log(' CHAMANDO API:', url);

    const isFormData = options.body instanceof FormData;

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: isFormData
        ? {
            ...(options.headers || {}),
          }
        : {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
          },
    });

    clearTimeout(timeout);

    const text = await response.text();

    let data: any = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      throw {
        status: response.status,
        data,
        message:
          data?.detail ||
          data?.message ||
          data ||
          `Erro na API: ${response.status}`,
      };
    }

    return data;
  } catch (error: any) {
    clearTimeout(timeout);

    if (error.name === 'AbortError') {
      throw {
        message: 'A API demorou muito para responder.',
      };
    }

    throw error;
  }
}